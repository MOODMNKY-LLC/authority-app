"use client"

import { useState, useEffect } from "react"
import { Users, Shield, User, Clock, Mail, Calendar, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

interface User {
  id: string
  user_id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  role: "pending" | "user" | "admin"
  created_at: string
  updated_at: string
  last_sign_in_at?: string
  email_confirmed_at?: string
}

export function AdminUsersSection() {
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingRoles, setUpdatingRoles] = useState<Set<string>>(new Set())

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/users")
      if (!response.ok) {
        throw new Error("Failed to fetch users")
      }
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error: any) {
      console.error("[Authority] Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const cycleRole = async (userId: string, currentRole: "pending" | "user" | "admin") => {
    // Cycle: pending → user → admin → pending
    const roleCycle: Record<"pending" | "user" | "admin", "pending" | "user" | "admin"> = {
      pending: "user",
      user: "admin",
      admin: "pending",
    }

    const newRole = roleCycle[currentRole]
    setUpdatingRoles((prev) => new Set(prev).add(userId))

    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          role: newRole,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update role")
      }

      const data = await response.json()
      
      // Update local state
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.user_id === userId ? { ...u, role: newRole as "pending" | "user" | "admin" } : u)),
      )

      toast({
        title: "Role Updated",
        description: `User role changed to ${newRole}`,
      })
    } catch (error: any) {
      console.error("[Authority] Error updating role:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      })
    } finally {
      setUpdatingRoles((prev) => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }

  const getRoleBadge = (role: "pending" | "user" | "admin") => {
    const variants = {
      pending: { variant: "secondary" as const, icon: Clock, label: "Pending" },
      user: { variant: "default" as const, icon: User, label: "User" },
      admin: { variant: "destructive" as const, icon: Shield, label: "Admin" },
    }

    const config = variants[role]
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1.5">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never"
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  if (loading) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-red-500" />
            User Management
          </CardTitle>
          <CardDescription>Manage user roles and access</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-red-500" />
              User Management
            </CardTitle>
            <CardDescription className="mt-1">
              Manage user roles and access. Click role badges to cycle: pending → user → admin
            </CardDescription>
          </div>
          <Button onClick={fetchUsers} variant="outline" size="sm">
            <Loader2 className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-3">
            {users.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found</p>
              </div>
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-zinc-950/50 border border-zinc-800/50 hover:border-zinc-700/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 border border-zinc-700">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-zinc-800 text-zinc-300">
                        {user.display_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-white truncate">
                          {user.display_name || user.email || "Unknown User"}
                        </p>
                        {user.email_confirmed_at && (
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" title="Email confirmed" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-zinc-400">
                        {user.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" />
                            <span className="truncate">{user.email}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Joined {formatDate(user.created_at)}</span>
                        </div>
                        {user.last_sign_in_at && (
                          <div className="text-zinc-500">
                            Last sign in: {formatDate(user.last_sign_in_at)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-4">
                    <Button
                      onClick={() => cycleRole(user.user_id, user.role)}
                      disabled={updatingRoles.has(user.user_id)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      {updatingRoles.has(user.user_id) ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        getRoleBadge(user.role)
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="mt-6 pt-4 border-t border-zinc-800/50">
          <div className="flex items-center justify-between text-sm text-zinc-400">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="flex items-center gap-1.5">
                  <Shield className="h-3 w-3" />
                  Admin
                </Badge>
                <span>{users.filter((u) => u.role === "admin").length} admin</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  User
                </Badge>
                <span>{users.filter((u) => u.role === "user").length} users</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Pending
                </Badge>
                <span>{users.filter((u) => u.role === "pending").length} pending</span>
              </div>
            </div>
            <div className="text-zinc-500">Total: {users.length} users</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


