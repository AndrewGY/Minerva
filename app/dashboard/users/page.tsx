"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserPlus, Mail, Shield, Search, Calendar } from "lucide-react";

interface User {
  _id: string;
  name: string;
  email: string;
  role: "ADMIN" | "OFFICER" | "SUPERVISOR" | "REPORTER";
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session || (session.user as any)?.role !== "ADMIN") {
      router.push("/login");
      return;
    }

    fetchUsers();
  }, [session, status, router]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (roleFilter !== "all") params.append("role", roleFilter);
      if (searchTerm) params.append("search", searchTerm);

      const response = await fetch(`/api/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status !== "loading") {
      fetchUsers();
    }
  }, [searchTerm, roleFilter, status]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === "ADMIN").length,
    officers: users.filter(u => u.role === "OFFICER").length,
    reporters: users.filter(u => u.role === "REPORTER").length,
  };

  const roleColors = {
    ADMIN: "bg-red-100 text-red-800",
    OFFICER: "bg-blue-100 text-blue-800", 
    SUPERVISOR: "bg-purple-100 text-purple-800",
    REPORTER: "bg-green-100 text-green-800",
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Users</h1>
            <p className="text-gray-600">Manage user accounts and permissions</p>
          </div>
          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Admins</p>
                <p className="text-3xl font-bold text-red-600">{stats.admins}</p>
              </div>
              <Shield className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Officers</p>
                <p className="text-3xl font-bold text-blue-600">{stats.officers}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Reporters</p>
                <p className="text-3xl font-bold text-green-600">{stats.reporters}</p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            All Users ({users.length})
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="OFFICER">Officer</SelectItem>
                <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                <SelectItem value="REPORTER">Reporter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No users found</p>
              </div>
            ) : (
              users.map((user) => (
                <div key={user._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{user.name}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        Joined {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className={roleColors[user.role]}>
                      <Shield className="w-3 h-3 mr-1" />
                      {user.role}
                    </Badge>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}