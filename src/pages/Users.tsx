import { useEffect, useState, useRef } from "react";
import { supabase } from "../utils/supa";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  ShieldAlert,
  Info,
  UserPlus2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Cookies from "js-cookie";
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Define the form schema
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .or(z.literal(""))
    .optional(),
  role: z.string().min(1, "Role is required"),
  file_path: z.string().optional(),
  public_url: z.string().optional(),
});

// Define the edit form schema (password is optional for editing)
const editFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .or(z.literal(""))
    .optional(),
  role: z.string().min(1, "Role is required"),
  file_path: z.string().optional(),
  public_url: z.string().optional(),
});

// Define the type for user data
interface UserData {
  user_id?: number | string;
  uuid?: string;
  name: string;
  email: string;
  role?: string;
  file_path?: string;
  public_url?: string | null;
}

// Current user type
interface CurrentUser {
  id: string;
  email: string;
  role: string;
  name: string;
  public_url?: string | null;
}

export default function Users() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);

  // Initialize add form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "",
    },
    mode: "onBlur", // Validate on field blur
  });

  // Initialize edit form
  const editForm = useForm<z.infer<typeof editFormSchema>>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "",
    },
    mode: "onBlur", // Validate on field blur
  });

  const fetchCurrentUser = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("uuid", user.id)
        .single();

      if (userError) {
        return;
      }

      // Get the signed URL for the avatar if file_path exists
      let publicUrl = null;
      if (userData?.file_path) {
        try {
          const { data } = supabase.storage
            .from('profilepic')
            .getPublicUrl(userData.file_path);

          publicUrl = data.publicUrl;
        } catch (storageError) {
          // Handle storage error silently
        }
      }

      setCurrentUser({
        id: user.id,
        email: user.email || "",
        role: userData?.role || user.user_metadata?.role || "",
        name: userData?.name || user.user_metadata?.name || "",
        public_url: publicUrl,
      });
    } catch (error) {
      console.error("Error in fetchCurrentUser:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: checkData, error: checkError } = await supabase
        .from("users")
        .select("*")
        .limit(1);

      if (checkError) {
        toast.error("Failed to check users table structure");
        return;
      }

      const firstUser = checkData?.[0] as Record<string, unknown> | undefined;
      const hasUserId = firstUser && "user_id" in firstUser;
      const hasId = firstUser && "id" in firstUser;

      let selectQuery = "";
      if (hasUserId) {
        selectQuery = "user_id";
      } else if (hasId) {
        selectQuery = "id";
      } else {
        selectQuery = "*";
      }
      selectQuery += ", uuid, name, email, role, file_path";

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select(selectQuery);

      if (userError) {
        toast.error("Failed to fetch users");
        return;
      }

      if (!userData) {
        setUsers([]);
        return;
      }

      // Map the data and get public URLs for avatars
      const mappedUsers = await Promise.all(userData.map(async (user: Record<string, any>) => {
        let publicUrl = null;
        if (user.file_path) {
          try {
            const { data } = supabase.storage
              .from('profilepic')
              .getPublicUrl(user.file_path);

            publicUrl = data.publicUrl;
          } catch (storageError) {
            // Handle storage error silently
          }
        }

        return {
          user_id: user.user_id || user.id,
          uuid: user.uuid,
          name: user.name,
          email: user.email,
          role: user.role,
          file_path: user.file_path,
          public_url: publicUrl,
        };
      }));

      setUsers(mappedUsers);
    } catch (fetchError: unknown) {
      toast.error("An unexpected error occurred while fetching users");
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchUsers();
  }, []);

  const isSuperAdmin = () => {
    return currentUser?.role === "superadmin";
  };

  const isOwnAccount = (user: UserData) => {
    return currentUser?.id === user.uuid;
  };

  const canEditUser = (user: UserData) => {
    return isSuperAdmin() || isOwnAccount(user);
  };

  const canDeleteUser = (user: UserData) => {
    return isSuperAdmin();
  };

  const canAddUser = () => {
    return isSuperAdmin();
  };

  const showPermissionDenied = () => {
    setIsPermissionDialogOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (!canAddUser()) {
        showPermissionDenied();
        return;
      }

      if (!captchaToken) {
        toast.error("Please complete the captcha verification");
        return;
      }

      // Check if password was provided for new user
      const hasPassword = values.password && values.password.trim().length > 0;
      if (!hasPassword) {
        toast.error("Password is required when creating a new user");
        return;
      }

      let filePath = '';
      let publicUrl = '';

      // Handle avatar upload if a file was selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('profilepic')
          .upload(filePath, avatarFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get a public URL for the avatar
        const { data } = supabase.storage
          .from('profilepic')
          .getPublicUrl(filePath);

        publicUrl = data.publicUrl;
      }

      // Create user in Supabase Auth first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password as string,
        options: {
          data: {
            name: values.name,
            role: values.role,
          },
          captchaToken: captchaToken,
        },
      });

      if (authError) throw authError;

      if (!authData.user?.id) {
        throw new Error("Failed to create user");
      }

      // Create user in your custom users table with the UUID and avatar info
      const { error: dbError } = await supabase.from("users").insert([
        {
          name: values.name,
          email: values.email,
          password: values.password,
          role: values.role,
          uuid: authData.user.id,
          file_path: filePath || null,
          public_url: publicUrl || null,
        },
      ]);

      if (dbError) {
        toast.error("Failed to add user to database");
        throw dbError;
      }

      toast.success("User added successfully");
      setIsDialogOpen(false);
      form.reset();
      setAvatarFile(null);
      setAvatarPreview(null);
      fetchUsers();
      if (captchaRef.current) {
        captchaRef.current.resetCaptcha();
      }
      setCaptchaToken(null);
    } catch (error: any) {
      console.error("Error adding user:", error);
      toast.error(error.message || "Failed to add user");
      if (captchaRef.current) {
        captchaRef.current.resetCaptcha();
      }
      setCaptchaToken(null);
    }
  };

  const handleEditUser = (user: UserData) => {
    // Allow superadmin to edit their own information
    if (isSuperAdmin() && user.uuid === currentUser?.id) {
      setSelectedUser(user);
      editForm.reset({
        name: currentUser?.name || "",
        email: currentUser?.email || "",
        password: "",
        role: currentUser?.role || "",
      });
      setIsEditDialogOpen(true);
      return;
    }

    // Check if the user can edit the selected user
    if (!canEditUser(user)) {
      showPermissionDenied();
      return;
    }

    setSelectedUser(user);
    editForm.reset({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = (user: UserData) => {
    if (!canDeleteUser(user)) {
      showPermissionDenied();
      return;
    }

    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleCancelEdit = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    setIsEditDialogOpen(false);
    setSelectedUser(null);
    // Wait for the dialog close animation to complete before resetting the form
    setTimeout(() => {
      editForm.reset();
    }, 300);
  };

  const onSubmitEdit = async (values: z.infer<typeof editFormSchema>) => {
    try {
      if (!selectedUser || !selectedUser.user_id || !selectedUser.uuid) {
        toast.error("User information is incomplete");
        return;
      }

      if (!canEditUser(selectedUser)) {
        showPermissionDenied();
        return;
      }

      const updateRole = isSuperAdmin() ? values.role : selectedUser.role;
      let filePath = selectedUser.file_path;
      let publicUrl = selectedUser.public_url;

      // Handle avatar update if a new file was selected
      if (editAvatarFile) {
        // Delete old avatar if it exists
        if (selectedUser.file_path) {
          await supabase.storage
            .from('profilepic')
            .remove([selectedUser.file_path]);
        }

        // Upload new avatar
        const fileExt = editAvatarFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('profilepic')
          .upload(filePath, editAvatarFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get a public URL for the new avatar
        const { data } = supabase.storage
          .from('profilepic')
          .getPublicUrl(filePath);

        publicUrl = data.publicUrl;
      }

      // Update user in your custom users table
      const updateData: any = {
        name: values.name,
        email: values.email,
        role: updateRole,
        file_path: filePath,
        public_url: publicUrl,
      };

      if (values.password && values.password.trim().length > 0) {
        updateData.password = values.password;
      }

      const { error: dbError } = await supabase
        .from("users")
        .update(updateData)
        .eq("user_id", selectedUser.user_id);

      if (dbError) throw dbError;

      // If user is updating their own account, update the auth metadata and cookies
      // This works because a user can update their own auth record
      if (isOwnAccount(selectedUser)) {
        // Create auth update data object without password
        const authUpdateData: any = {
          email: values.email,
          data: {
            name: values.name,
            role: updateRole,
          },
        };

        // Only include password in update if it's actually provided
        if (values.password && values.password.trim().length > 0) {
          authUpdateData.password = values.password;
        }

        // Submit the update
        const { error: authError } = await supabase.auth.updateUser(
          authUpdateData
        );

        if (authError) {
          toast.warning(
            "User details updated but authentication profile could not be updated."
          );
        } else {
          // Update the user_data cookie to reflect the changes immediately
          try {
            const currentUserData = JSON.parse(
              Cookies.get("user_data") || "{}"
            );
            const updatedUserData = {
              ...currentUserData,
              name: values.name,
              email: values.email,
              role: updateRole,
            };
            Cookies.set("user_data", JSON.stringify(updatedUserData));
          } catch (cookieError) {
            // Handle cookie error silently
          }
        }
      } else if (isSuperAdmin()) {
        // If a superadmin is editing someone else, we can't update their auth directly

        // But if the user we're editing is currently logged in on this browser,
        // we should update their cookie data to reflect the changes
        try {
          const currentUserData = JSON.parse(Cookies.get("user_data") || "{}");

          // Check if the edited user is the one currently logged in
          if (currentUserData.uuid === selectedUser.uuid) {
            const updatedUserData = {
              ...currentUserData,
              name: values.name,
              email: values.email,
              role: updateRole,
            };
            Cookies.set("user_data", JSON.stringify(updatedUserData));
            toast.info(
              "User session data updated. Changes will be reflected immediately.",
              {
                duration: 3000,
              }
            );
          } else {
            toast.info(
              "User database record updated. Auth record may need server-side update.",
              {
                duration: 5000,
              }
            );
          }
        } catch (cookieError) {
          toast.info(
            "User database record updated. Auth record may need server-side update.",
            {
              duration: 5000,
            }
          );
        }
      }

      toast.success("User updated successfully");
      setIsEditDialogOpen(false);
      editForm.reset();
      fetchUsers(); // Refresh the users list

      // Update currentUser if editing own account
      if (isOwnAccount(selectedUser)) {
        fetchCurrentUser();
      }

      setSelectedUser(null);
      setEditAvatarFile(null);
      setEditAvatarPreview(null);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(error.message || "Failed to update user");
    }
  };

  const confirmDeleteUser = async () => {
    try {
      if (!selectedUser || !selectedUser.user_id || !selectedUser.uuid) {
        toast.error("User information is incomplete");
        return;
      }

      // Check permissions again before deleting
      if (!canDeleteUser(selectedUser)) {
        showPermissionDenied();
        return;
      }

      // With client-side code, we can't use the admin API to delete users
      // We'll delete from the database and show a message about auth deletion

      // Delete user from custom users table
      const { error: dbError } = await supabase
        .from("users")
        .delete()
        .eq("user_id", selectedUser.user_id);

      if (dbError) {
        toast.error("Failed to delete user from database");
        throw dbError;
      }

      toast.success("User deleted from database", {
        description:
          "Note: The authentication record may require server-side deletion by an administrator.",
      });

      setIsDeleteDialogOpen(false);
      fetchUsers(); // Refresh the users list
      setSelectedUser(null);
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Failed to delete user");
    }
  };

  const handleVerificationSuccess = (token: string) => {
    setCaptchaToken(token);
  };

  const entriesPerPage = 3; // Define the number of entries per page
  const pageCount = Math.ceil(users.length / entriesPerPage); // Calculate total pages

  // Update the users to display based on the current page
  const displayedUsers = users.slice(
    currentPage * entriesPerPage,
    (currentPage + 1) * entriesPerPage
  );

  // Add function to handle avatar upload
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      if (isEdit) {
        setEditAvatarFile(file);
        setEditAvatarPreview(URL.createObjectURL(file));
      } else {
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-2xl font-medium font-poppins text-blue-900">
          Account Information
        </h1>
      </div>

      <div className="mt-4">
        {currentUser ? (
          <div className="mt-4 grid grid-cols-1 gap-2 items-start">
            {/* Left Column: Smaller Profile Card */}
            <div className="flex flex-col items-center w-full">
              <Avatar className="w-24 h-24 mb-2">
                {currentUser?.public_url ? (
                  <AvatarImage 
                    src={currentUser.public_url} 
                    alt={currentUser.name}
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-2xl font-poppins w-full h-full">
                    {currentUser?.name
                      ? currentUser.name.split(" ")[0][0].toUpperCase()
                      : "?"}
                  </AvatarFallback>
                )}
              </Avatar>

              <div className="flex flex-col items-center text-center">
                <span className="text-lg font-semibold font-poppins text-gray-800">
                  {currentUser.name}
                </span>
                <span className="text-sm font-poppins text-gray-600">
                  {currentUser.email}
                </span>
                {/* <span className="text-[10px] font-poppins text-white mt-1 px-2 py-1 bg-blue-500 rounded-full inline-block w-fit">
                  {currentUser.role}
                </span> */}
              </div>
            </div>

            {/* Right Column: Larger Personal Details Card */}
            <Card className="flex flex-col w-full border-gray-300 bg-white shadow-sm mt-5 p-7">
              <CardContent>
                <Form {...editForm}>
                  <form
                    onSubmit={editForm.handleSubmit(onSubmitEdit)}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8"
                  >
                    {/* Left Column: Name and Email */}
                    <div className="space-y-4">
                      <FormField
                        control={editForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter name"
                                {...field}
                                defaultValue={currentUser?.name || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="Enter email"
                                {...field}
                                defaultValue={currentUser?.email || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Right Column: Password and Role */}
                    <div className="space-y-4">
                      <FormField
                        control={editForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Password
                              <span className="ml-1 text-xs text-gray-500 font-normal">
                                (optional)
                              </span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Enter new password"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <p className="text-xs text-gray-500 mt-1">
                              Only enter a password if you want to change it.
                              Leave empty to keep the current password.
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={currentUser?.role || ""}
                              disabled={!isSuperAdmin()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="superadmin">
                                  Super Admin
                                </SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="wcpd">WCPD</SelectItem>
                              </SelectContent>
                            </Select>
                            {!isSuperAdmin() && (
                              <p className="text-xs text-gray-500 mt-1">
                                Only superadmins can change roles.
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Footer: Buttons */}
                    <div className="col-span-2 flex justify-end gap-4 mt-6">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-blue-900 hover:bg-blue-800"
                      >
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        ) : (
          <span className="text-sm font-poppins text-gray-600">Loading...</span>
        )}
      </div>

      {/* Display all users if superadmin */}
      {isSuperAdmin() && (
        <div className="mt-6 font-poppins">
          <Card className="p-4 border-gray-300 bg-white shadow-sm">
            <div className="flex justify-between items-center">
              <CardHeader className="text-xl font-semibold">
                All Users
              </CardHeader>
              {canAddUser() && (
                <Button
                  className="bg-blue-900 text-white px-4 rounded-lg flex items-center hover:bg-blue-800 mr-9"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <UserPlus2 size={16} /> Add User
                </Button>
              )}
            </div>

            <CardContent>
              <table className="min-w-full border-collapse table-auto">
                <thead className="bg-blue-100 text-blue-900">
                  <tr>
                    <th className="px-6 py-3 text-left border-b">Avatar</th>
                    <th className="px-6 py-3 text-left border-b">Name</th>
                    <th className="px-6 py-3 text-left border-b">Email</th>
                    <th className="px-6 py-3 text-left border-b">Role</th>
                    <th className="px-6 py-3 text-left border-b">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayedUsers.map((user) => (
                    <tr
                      key={user.user_id}
                      className="hover:bg-blue-50 transition-colors duration-200"
                    >
                      <td className="px-6 py-2 whitespace-nowrap">
                        <Avatar className="w-10 h-10">
                          {user.public_url ? (
                            <AvatarImage 
                              src={user.public_url} 
                              alt={user.name}
                              className="w-full h-full object-cover rounded-full"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-lg font-poppins w-full h-full">
                              {user.name ? user.name.split(" ")[0][0].toUpperCase() : "?"}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                        {user.name}
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                        {user.role}
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-sm font-medium flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditUser(user)}
                          className="hover:bg-blue-100 border-none shadow-none bg-transparent"
                        >
                          <Pencil size={16} className="text-blue-900" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteUser(user)}
                          className="hover:bg-red-100 border-none shadow-none bg-transparent"
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
            <CardFooter>
              <Pagination>
                <PaginationContent className="flex items-center space-x-2">
                  <PaginationItem>
                    <PaginationLink
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(0, prev - 1))
                      }
                      aria-disabled={currentPage === 0}
                      className="text-xs mr-7"
                    >
                      <PaginationPrevious />
                    </PaginationLink>
                  </PaginationItem>

                  {Array.from({ length: pageCount }, (_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        onClick={() => setCurrentPage(i)}
                        isActive={currentPage === i}
                        className="text-xs"
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationLink
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(pageCount - 1, prev + 1)
                        )
                      }
                      aria-disabled={currentPage === pageCount - 1}
                      className="text-xs mx-3"
                    >
                      <PaginationNext />
                    </PaginationLink>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Add User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex flex-col items-center mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 mb-2">
                  {avatarPreview ? (
                    <img 
                      src={avatarPreview} 
                      alt="Avatar preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <UserPlus2 className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleAvatarChange(e)}
                  className="max-w-[200px]"
                />
                <p className="text-xs text-gray-500 mt-1">Upload profile picture</p>
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Password <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter password"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500 mt-1">
                      Password is required when creating a new user.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="superadmin">Super Admin</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="wcpd">WCPD</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="mt-4">
                <HCaptcha
                  sitekey="2028db5a-e45c-418a-bb88-cd600e04402c"
                  onVerify={handleVerificationSuccess}
                  ref={captchaRef}
                />
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                  Add User
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            // Dialog is closing, use the same handler as the cancel button
            handleCancelEdit();
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onSubmitEdit)}
              className="space-y-4"
            >
              <div className="flex flex-col items-center mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 mb-2">
                  {editAvatarPreview ? (
                    <img 
                      src={editAvatarPreview} 
                      alt="Avatar preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : selectedUser?.public_url ? (
                    <img 
                      src={selectedUser.public_url} 
                      alt="Current avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <UserPlus2 className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleAvatarChange(e, true)}
                  className="max-w-[200px]"
                />
                <p className="text-xs text-gray-500 mt-1">Update profile picture</p>
              </div>

              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Password
                      <span className="ml-1 text-xs text-gray-500 font-normal">
                        (optional)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter new password"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500 mt-1">
                      Only enter a password if you want to change it. Leave
                      empty to keep current password.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!isSuperAdmin()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="superadmin">Super Admin</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="wcpd">WCPD</SelectItem>
                      </SelectContent>
                    </Select>
                    {!isSuperAdmin() && (
                      <p className="text-xs text-gray-500 mt-1">
                        Only superadmins can change roles.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle size={18} className="text-red-600" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUser?.name}? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteUser}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permission Denied Dialog */}
      <Dialog
        open={isPermissionDialogOpen}
        onOpenChange={setIsPermissionDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <ShieldAlert size={18} />
              Permission Denied
            </DialogTitle>
            <DialogDescription>
              <p>You don't have permission to perform this action.</p>
              <ul className="list-disc pl-5 mt-2 text-sm">
                <li>Only superadmins can add new users</li>
                <li>Only superadmins can delete users</li>
                <li>Regular users can only edit their own accounts</li>
                <li>Only superadmins can change user roles</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
