"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
}

export default function ModeratorProfilesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ username?: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user
        const userRes = await fetch("/api/auth/user");
        if (userRes.ok) {
          const userData = await userRes.json();
          setCurrentUser(userData.user);

          // Check if user is operator
          const isOperator = userData.user?.username === (process.env.NEXT_PUBLIC_OP_USERNAME || "operator");
          if (!isOperator) {
            router.push("/");
            return;
          }

          // Fetch all users
          const usersRes = await fetch("/api/moderator/users");
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            setUsers(usersData);
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredUsers = users.filter((user) => {
    const search = searchTerm.toLowerCase();
    return (
      user.username.toLowerCase().includes(search) ||
      (user.name && user.name.toLowerCase().includes(search)) ||
      (user.email && user.email.toLowerCase().includes(search))
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              InvestFest 2026
            </Link>
            <span className="text-slate-500">→</span>
            <span className="text-slate-700 font-medium">Moderator: View Profiles</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
            >
              ← Back
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">View User Profiles</h1>
          
          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search by username, name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Users List */}
          <div className="space-y-2">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <Link
                  key={user.id}
                  href={`/moderator/profile/${user.id}`}
                  className="block bg-slate-50 hover:bg-slate-100 rounded-lg p-4 transition-colors border border-slate-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      {user.name && (
                        <div className="font-semibold text-slate-900">{user.name}</div>
                      )}
                      <div className="text-sm text-slate-600">@{user.username}</div>
                      {user.email && (
                        <div className="text-xs text-slate-500">{user.email}</div>
                      )}
                    </div>
                    <div className="text-blue-600 font-medium">
                      View Profile →
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-slate-500 text-center py-8">No users found</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

