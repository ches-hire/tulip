"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Memory } from "@/types/memory";

type AuthStatus = "checking" | "authorized" | "unauthorized";

type MemoryForm = {
  id?: string;
  petal_index: number;
  title: string;
  message: string;
  image_url: string;
  memory_date: string;
};

const PETAL_SLOTS = [0, 1, 2, 3, 4, 5];
const IMAGE_BUCKET = "tulip-images";
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function createEmptySlot(petalIndex: number): MemoryForm {
  return {
    petal_index: petalIndex,
    title: "",
    message: "",
    image_url: "",
    memory_date: "",
  };
}

function memoryToForm(memory: Memory): MemoryForm {
  return {
    id: memory.id,
    petal_index: memory.petal_index,
    title: memory.title,
    message: memory.message,
    image_url: memory.image_url,
    memory_date: memory.memory_date ?? "",
  };
}

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getStoragePathFromPublicUrl(imageUrl: string) {
  const marker = `/storage/v1/object/public/${IMAGE_BUCKET}/`;
  const markerIndex = imageUrl.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  return decodeURIComponent(imageUrl.slice(markerIndex + marker.length));
}

export default function AdminPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [forms, setForms] = useState<MemoryForm[]>(
    PETAL_SLOTS.map(createEmptySlot),
  );
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);
  const [savingPetal, setSavingPetal] = useState<number | null>(null);
  const [deletingPetal, setDeletingPetal] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Record<number, File | null>>(
    {},
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function verifyAdmin() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (isMounted) {
            setStatus("unauthorized");
          }
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (!isMounted) {
          return;
        }

        setStatus(profile?.role === "admin" ? "authorized" : "unauthorized");
      } catch {
        if (isMounted) {
          setStatus("unauthorized");
        }
      }
    }

    verifyAdmin();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (status === "unauthorized") {
      router.replace("/login");
    }
  }, [router, status]);

  useEffect(() => {
    if (status !== "authorized") {
      return;
    }

    let isMounted = true;

    async function loadMemories() {
      setIsLoadingMemories(true);
      setError(null);

      const { data, error: memoriesError } = await supabase
        .from("petals")
        .select("*")
        .order("petal_index", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (memoriesError) {
        setError(memoriesError.message);
        setIsLoadingMemories(false);
        return;
      }

      const memoriesByIndex = new Map(
        (data as Memory[] | null)?.map((memory) => [
          memory.petal_index,
          memoryToForm(memory),
        ]) ?? [],
      );

      setForms(
        PETAL_SLOTS.map(
          (petalIndex) =>
            memoriesByIndex.get(petalIndex) ?? createEmptySlot(petalIndex),
        ),
      );
      setIsLoadingMemories(false);
    }

    loadMemories();

    return () => {
      isMounted = false;
    };
  }, [status, supabase]);

  function updateForm(petalIndex: number, field: keyof MemoryForm, value: string) {
    setForms((currentForms) =>
      currentForms.map((form) =>
        form.petal_index === petalIndex ? { ...form, [field]: value } : form,
      ),
    );
  }

  function selectImageFile(petalIndex: number, file: File | null) {
    setNotice(null);
    setError(null);

    if (!file) {
      setSelectedFiles((currentFiles) => ({
        ...currentFiles,
        [petalIndex]: null,
      }));
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Images must be JPG, PNG, or WEBP.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError("Images must be 5 MB or smaller.");
      return;
    }

    setSelectedFiles((currentFiles) => ({
      ...currentFiles,
      [petalIndex]: file,
    }));
  }

  async function uploadImage(petalIndex: number, file: File) {
    const filePath = `petals/${petalIndex}/${crypto.randomUUID()}-${sanitizeFileName(
      file.name,
    )}`;

    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(filePath);

    return publicUrl;
  }

  async function removeStoredImage(imageUrl: string) {
    const storagePath = getStoragePathFromPublicUrl(imageUrl);

    if (!storagePath) {
      return;
    }

    await supabase.storage.from(IMAGE_BUCKET).remove([storagePath]);
  }

  async function handleSave(
    event: FormEvent<HTMLFormElement>,
    form: MemoryForm,
  ) {
    event.preventDefault();
    setSavingPetal(form.petal_index);
    setNotice(null);
    setError(null);

    const selectedFile = selectedFiles[form.petal_index];
    let imageUrl = form.image_url.trim();

    try {
      if (selectedFile) {
        imageUrl = await uploadImage(form.petal_index, selectedFile);
      }
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload the image.",
      );
      setSavingPetal(null);
      return;
    }

    if (!imageUrl) {
      setError("Upload an image before saving this memory.");
      setSavingPetal(null);
      return;
    }

    const payload = {
      petal_index: form.petal_index,
      title: form.title.trim(),
      message: form.message.trim(),
      image_url: imageUrl,
      memory_date: form.memory_date || null,
    };

    const { data, error: saveError } = await supabase
      .from("petals")
      .upsert(payload, { onConflict: "petal_index" })
      .select("*")
      .single();

    if (saveError) {
      setError(saveError.message);
      setSavingPetal(null);
      return;
    }

    const savedForm = memoryToForm(data as Memory);
    if (selectedFile && form.image_url && form.image_url !== savedForm.image_url) {
      await removeStoredImage(form.image_url);
    }
    setForms((currentForms) =>
      currentForms.map((currentForm) =>
        currentForm.petal_index === savedForm.petal_index
          ? savedForm
          : currentForm,
      ),
    );
    setSelectedFiles((currentFiles) => ({
      ...currentFiles,
      [form.petal_index]: null,
    }));
    setNotice(`Petal ${form.petal_index + 1} saved.`);
    setSavingPetal(null);
  }

  async function handleDelete(form: MemoryForm) {
    if (!form.id) {
      setNotice(`Petal ${form.petal_index + 1} is already empty.`);
      return;
    }

    setDeletingPetal(form.petal_index);
    setNotice(null);
    setError(null);

    const { error: deleteError } = await supabase
      .from("petals")
      .delete()
      .eq("id", form.id);

    if (deleteError) {
      setError(deleteError.message);
      setDeletingPetal(null);
      return;
    }

    await removeStoredImage(form.image_url);
    setForms((currentForms) =>
      currentForms.map((currentForm) =>
        currentForm.petal_index === form.petal_index
          ? createEmptySlot(form.petal_index)
          : currentForm,
      ),
    );
    setSelectedFiles((currentFiles) => ({
      ...currentFiles,
      [form.petal_index]: null,
    }));
    setNotice(`Petal ${form.petal_index + 1} cleared.`);
    setDeletingPetal(null);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main className="min-h-screen bg-[#fff8fb] px-4 py-8 text-[#25161d] sm:px-6">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 border-b border-[#efd4df] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a83f62]">
              Admin
            </p>
            <h1 className="mt-3 text-3xl font-semibold">Memory Management</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex rounded-md border border-[#dba9bc] px-4 py-3 text-sm font-semibold text-[#7a2947] transition hover:border-[#a83f62]"
              href="/"
            >
              View gallery
            </Link>
            <button
              className="rounded-md bg-[#25161d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#3b2630]"
              type="button"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </div>
        </div>

        {status === "checking" ? (
          <p className="mt-6 text-[#6f4c5c]">Checking admin access...</p>
        ) : null}

        {status === "authorized" ? (
          <div className="mt-8">
            {error ? (
              <p className="mb-5 rounded-md border border-[#e8bfce] bg-white px-4 py-3 text-sm text-[#9b274e]">
                {error}
              </p>
            ) : null}
            {notice ? (
              <p className="mb-5 rounded-md border border-[#bddfc8] bg-white px-4 py-3 text-sm text-[#22633a]">
                {notice}
              </p>
            ) : null}
            {isLoadingMemories ? (
              <p className="text-[#6f4c5c]">Loading memory slots...</p>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                {forms.map((form) => (
                  <form
                    className="rounded-lg border border-[#efd4df] bg-white p-4 shadow-sm"
                    key={form.petal_index}
                    onSubmit={(event) => handleSave(event, form)}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-[#efd4df] bg-[#fff8fb] sm:w-40">
                        {form.image_url ? (
                          <Image
                            alt={`Petal ${form.petal_index + 1} preview`}
                            className="object-cover"
                            fill
                            sizes="(max-width: 640px) 100vw, 160px"
                            src={form.image_url}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-[#8a6675]">
                            Empty slot
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h2 className="text-lg font-semibold">
                            Petal {form.petal_index + 1}
                          </h2>
                          <span className="rounded-full border border-[#efd4df] px-3 py-1 text-xs font-semibold text-[#7a2947]">
                            Index {form.petal_index}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3">
                          <label className="grid gap-1 text-sm font-medium">
                            Title
                            <input
                              className="rounded-md border border-[#e8bfce] px-3 py-2 outline-none transition focus:border-[#a83f62]"
                              required
                              type="text"
                              value={form.title}
                              onChange={(event) =>
                                updateForm(
                                  form.petal_index,
                                  "title",
                                  event.target.value,
                                )
                              }
                            />
                          </label>
                          <label className="grid gap-1 text-sm font-medium">
                            Message
                            <textarea
                              className="min-h-24 rounded-md border border-[#e8bfce] px-3 py-2 outline-none transition focus:border-[#a83f62]"
                              required
                              value={form.message}
                              onChange={(event) =>
                                updateForm(
                                  form.petal_index,
                                  "message",
                                  event.target.value,
                                )
                              }
                            />
                          </label>
                          <label className="grid gap-1 text-sm font-medium">
                            Image
                            <input
                              accept="image/jpeg,image/png,image/webp"
                              className="rounded-md border border-[#e8bfce] px-3 py-2 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-[#a83f62] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white focus:border-[#a83f62]"
                              type="file"
                              onChange={(event) =>
                                selectImageFile(
                                  form.petal_index,
                                  event.target.files?.[0] ?? null,
                                )
                              }
                            />
                            {selectedFiles[form.petal_index] ? (
                              <span className="text-xs font-normal text-[#6f4c5c]">
                                Selected: {selectedFiles[form.petal_index]?.name}
                              </span>
                            ) : null}
                          </label>
                          <label className="grid gap-1 text-sm font-medium">
                            Public image URL
                            <input
                              className="rounded-md border border-[#e8bfce] bg-[#fff8fb] px-3 py-2 text-sm outline-none"
                              readOnly
                              type="url"
                              value={form.image_url}
                            />
                          </label>
                          <label className="grid gap-1 text-sm font-medium">
                            Date
                            <input
                              className="rounded-md border border-[#e8bfce] px-3 py-2 outline-none transition focus:border-[#a83f62]"
                              type="date"
                              value={form.memory_date}
                              onChange={(event) =>
                                updateForm(
                                  form.petal_index,
                                  "memory_date",
                                  event.target.value,
                                )
                              }
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap justify-end gap-3">
                      <button
                        className="rounded-md border border-[#dba9bc] px-4 py-2 text-sm font-semibold text-[#7a2947] transition hover:border-[#a83f62] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={
                          deletingPetal === form.petal_index ||
                          savingPetal === form.petal_index
                        }
                        type="button"
                        onClick={() => handleDelete(form)}
                      >
                        {deletingPetal === form.petal_index
                          ? "Clearing..."
                          : "Delete"}
                      </button>
                      <button
                        className="rounded-md bg-[#a83f62] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8c3150] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={
                          savingPetal === form.petal_index ||
                          deletingPetal === form.petal_index
                        }
                        type="submit"
                      >
                        {savingPetal === form.petal_index
                          ? "Saving..."
                          : "Save"}
                      </button>
                    </div>
                  </form>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}
