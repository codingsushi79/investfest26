"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Newspaper, Pin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AC } from "@/lib/autocomplete";
import { useLive, useLiveRefresh } from "@/lib/live";

type Post = {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  isPublished: boolean;
  emailedAt: string | null;
  author: string;
  createdAt: string;
};

export default function NewsPage() {
  const router = useRouter();
  const refreshLive = useLiveRefresh();

  const { data, loading, error } = useLive<{
    posts: Post[];
    canManage: boolean;
    canEmail: boolean;
  }>("/api/news");

  const posts = data?.posts ?? [];
  const canManage = data?.canManage ?? false;
  const canEmail = data?.canEmail ?? false;

  const [composeOpen, setComposeOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (error === "HTTP 404") router.replace("/");
  }, [error, router]);

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, isPinned: pinned, sendEmail }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not post");

      toast.success(
        result.emailed > 0
          ? `Posted and emailed to ${result.emailed} ${
              result.emailed === 1 ? "person" : "people"
            }`
          : "Posted"
      );
      setComposeOpen(false);
      setTitle("");
      setBody("");
      setPinned(false);
      setSendEmail(false);
      refreshLive("/api/news");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not post");
    } finally {
      setSaving(false);
    }
  }

  async function updatePost(id: string, patch: Record<string, unknown>) {
    const response = await fetch(`/api/news/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      toast.error(result.error || "Could not update");
      return;
    }
    refreshLive("/api/news");
  }

  async function deletePost(id: string, postTitle: string) {
    if (!window.confirm(`Delete "${postTitle}"? This cannot be undone.`)) return;

    const response = await fetch(`/api/news/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      toast.error(result.error || "Could not delete");
      return;
    }
    toast.success("Post deleted");
    refreshLive("/api/news");
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="News"
        description="Announcements from the event operator."
      >
        {canManage && (
          <Button size="sm" onClick={() => setComposeOpen(true)}>
            <Plus data-icon="inline-start" />
            New post
          </Button>
        )}
      </PageHeader>

      {posts.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="No news yet"
          description="Announcements from the operator will show up here."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <Card key={post.id} className={post.isPinned ? "border-primary/40" : undefined}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-lg">{post.title}</CardTitle>
                  <div className="flex shrink-0 items-center gap-1">
                    {post.isPinned && (
                      <Badge variant="secondary" className="text-xs">
                        Pinned
                      </Badge>
                    )}
                    {!post.isPublished && (
                      <Badge variant="outline" className="text-xs">
                        Draft
                      </Badge>
                    )}
                    {post.emailedAt && (
                      <Badge variant="outline" className="text-xs">
                        Emailed
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {post.author} · {new Date(post.createdAt).toLocaleString()}
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {/* Rendered as plain text: posts are never treated as markup. */}
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.body}</p>

                {canManage && (
                  <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updatePost(post.id, { isPinned: !post.isPinned })}
                    >
                      <Pin data-icon="inline-start" />
                      {post.isPinned ? "Unpin" : "Pin"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updatePost(post.id, { isPublished: !post.isPublished })
                      }
                    >
                      {post.isPublished ? "Unpublish" : "Publish"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deletePost(post.id, post.title)}
                    >
                      <Trash2 data-icon="inline-start" />
                      Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New announcement</DialogTitle>
            <DialogDescription>
              Posts appear on this page for everyone.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={publish} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="news-title">Title</Label>
              <Input
                id="news-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={140}
                autoComplete={AC.off}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="news-body">Body</Label>
              <Textarea
                id="news-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={8}
                maxLength={5000}
                required
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={pinned}
                onCheckedChange={(checked) => setPinned(checked === true)}
              />
              Pin to the top
            </label>

            {canEmail && (
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={sendEmail}
                  onCheckedChange={(checked) => setSendEmail(checked === true)}
                />
                <span>
                  Also email every verified user
                  <span className="block text-xs text-muted-foreground">
                    This goes out immediately and cannot be recalled.
                  </span>
                </span>
              </label>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setComposeOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !title || !body}>
                {saving ? "Posting…" : sendEmail ? "Post and email" : "Post"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
