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
  Lock,
  IdCard,
  Edit,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<"info" | "password">("info");
  const [isNameChanged, setIsNameChanged] = useState(false);
  const [isEmailChanged, setIsEmailChanged] = useState(false);

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
      name: currentUser?.name || "",
      email: currentUser?.email || "",
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
            .from("profilepic")
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

      // Update edit form default values after fetching current user
      editForm.reset({
        name: userData?.name || "",
        email: userData?.email || "",
        password: "",
        role: userData?.role || "",
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
      const mappedUsers = await Promise.all(
        userData.map(async (user: Record<string, any>) => {
          let publicUrl = null;
          if (user.file_path) {
            try {
              const { data } = supabase.storage
                .from("profilepic")
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
        })
      );

      setUsers(mappedUsers);
    } catch (fetchError: unknown) {
      toast.error("An unexpected error occurred while fetching users");
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchUsers();

    // Set up realtime subscription for user updates
    const channel = supabase
      .channel('user_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users'
        },
        (payload) => {
          // Handle different types of updates
          if (payload.eventType === 'UPDATE') {
            const updatedUser = payload.new as UserData;
            
            // Update users list
            setUsers(prevUsers => 
              prevUsers.map(user => 
                user.uuid === updatedUser.uuid ? updatedUser : user
              )
            );

            // Update current user if it's their data
            if (currentUser && currentUser.id === updatedUser.uuid) {
              setCurrentUser(prev => ({
                ...prev!,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role || '',
                public_url: updatedUser.public_url
              }));

              // If role changed to/from superadmin, refresh the page to update permissions
              if (currentUser?.role !== updatedUser.role && 
                  (currentUser?.role === 'superadmin' || updatedUser.role === 'superadmin')) {
                window.location.reload();
              }
            }
          } else if (payload.eventType === 'INSERT') {
            const newUser = payload.new as UserData;
            setUsers(prevUsers => [...prevUsers, newUser]);
          } else if (payload.eventType === 'DELETE') {
            const deletedUser = payload.old as UserData;
            setUsers(prevUsers => 
              prevUsers.filter(user => user.uuid !== deletedUser.uuid)
            );
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

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

      let filePath = "";
      let publicUrl = "";

      // Handle avatar upload if a file was selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("profilepic")
          .upload(filePath, avatarFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get a public URL for the avatar
        const { data } = supabase.storage
          .from("profilepic")
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

    // Allow regular users to edit their own information
    if (isOwnAccount(user)) {
      setSelectedUser(user);
      editForm.reset({
        name: user.name,
        email: user.email,
        password: "",
        role: user.role || "",
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
      // console.log("Form Values: ", values);
      // console.log("Selected User: ", currentUser?.id);

      // Check if we're editing from profile tab or user list
      const isProfileEdit = !selectedUser;

      // Get the current user's data from the database if editing from profile tab
      let currentUserData;
      if (isProfileEdit) {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("uuid", currentUser?.id)
          .single();

        if (error) {
          throw error;
        }
        currentUserData = data;
      }

      const userToEdit: UserData = isProfileEdit ? {
        user_id: currentUser?.id || '',
        uuid: currentUser?.id || '',
        name: currentUser?.name || values.name,
        email: currentUser?.email || values.email,
        role: currentUser?.role || values.role,
        file_path: currentUserData?.file_path || '',
        public_url: currentUserData?.public_url || null
      } : selectedUser;

      // Check if we have the required information
      if (!userToEdit || !userToEdit.uuid) {
        toast.error("User information is incomplete");
        return;
      }

      // Permission check for editing
      if (isProfileEdit || isOwnAccount(userToEdit)) {
        // No need to check permissions for own account
      } else if (!canEditUser(userToEdit)) {
        showPermissionDenied();
        return;
      }

      // If the user is editing their own account, update the role or keep existing
      const updateRole = isSuperAdmin() ? values.role : userToEdit.role;
      let filePath = userToEdit.file_path;
      let publicUrl = userToEdit.public_url;

      // Handle avatar update if a new file was selected
      if (editAvatarFile) {
        // Delete old avatar if it exists
        if (userToEdit.file_path) {
          await supabase.storage.from("profilepic").remove([userToEdit.file_path]);
        }

        // Upload new avatar
        const fileExt = editAvatarFile.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("profilepic")
          .upload(filePath, editAvatarFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get a public URL for the new avatar
        const { data } = supabase.storage.from("profilepic").getPublicUrl(filePath);
        publicUrl = data.publicUrl;
      }

      // Prepare update data
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

      // Update user in the database
      const { error: dbError } = await supabase
        .from("users")
        .update(updateData)
        .eq("uuid", userToEdit.uuid);

      if (dbError) throw dbError;

      // If user is updating their own account, update the auth metadata and cookies
      if (isProfileEdit || isOwnAccount(userToEdit)) {
        const authUpdateData: any = {
          email: values.email,
          data: {
            name: values.name,
            role: updateRole,
          },
        };

        if (values.password && values.password.trim().length > 0) {
          authUpdateData.password = values.password;
        }

        const { error: authError } = await supabase.auth.updateUser(authUpdateData);

        if (authError) {
          toast.warning("User details updated but authentication profile could not be updated.");
        } else {
          // Update the user_data cookie
          try {
            const currentUserData = JSON.parse(Cookies.get("user_data") || "{}");
            const updatedUserData = { ...currentUserData, name: values.name, email: values.email, role: updateRole };
            Cookies.set("user_data", JSON.stringify(updatedUserData));
          } catch (cookieError) {
            console.error(cookieError);
          }
        }
      }

      toast.success("User updated successfully");
      setIsEditDialogOpen(false);
      editForm.reset();
      fetchUsers(); // Refresh the users list

      // Update currentUser if editing own account
      if (isProfileEdit || isOwnAccount(userToEdit)) {
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
      // We'll delete from the database and show a note about auth deletion

      // Delete user from users table
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
  const handleAvatarChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    isEdit: boolean = false
  ) => {
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

  const handleNameChange = (value: string) => {
    setIsNameChanged(value !== currentUser?.name);
    editForm.setValue("name", value);
  };

  const handleEmailChange = (value: string) => {
    setIsEmailChanged(value !== currentUser?.email);
    editForm.setValue("email", value);
  };

  const handleMainAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Delete old avatar if it exists
      if (currentUser?.public_url) {
        const { data } = await supabase
          .from("users")
          .select("file_path")
          .eq("uuid", currentUser.id)
          .single();

        if (data?.file_path) {
          await supabase.storage.from("profilepic").remove([data.file_path]);
        }
      }

      // Upload new avatar
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("profilepic")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage.from("profilepic").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      // Update user in database
      const { error: dbError } = await supabase
        .from("users")
        .update({
          file_path: filePath,
          public_url: publicUrl,
        })
        .eq("uuid", currentUser?.id);

      if (dbError) throw dbError;

      // Update auth metadata
      await supabase.auth.updateUser({
        data: {
          avatar_url: publicUrl,
        },
      });

      // Update cookie
      try {
        const currentUserData = JSON.parse(Cookies.get("user_data") || "{}");
        const updatedUserData = { ...currentUserData, public_url: publicUrl };
        Cookies.set("user_data", JSON.stringify(updatedUserData));
      } catch (cookieError) {
        console.error(cookieError);
      }

      // Refresh user data
      fetchCurrentUser();
      fetchUsers();
      toast.success("Avatar updated successfully");
    } catch (error: any) {
      console.error("Error updating avatar:", error);
      toast.error(error.message || "Failed to update avatar");
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <h1 className="text-xl md:text-2xl font-medium text-blue-900 mb-8 md:mb-20">
        Account Information
      </h1>

      {/* Main Content - Stacked on mobile, side by side on desktop */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {/* Left Column - Profile Section */}
        <div className="flex flex-col items-center w-full md:w-1/3 p-4 rounded-lg shadow-sm md:shadow-none">
          <div className="relative">
            <Avatar className="w-24 h-24 md:w-32 md:h-32 cursor-pointer group">
              {currentUser?.public_url ? (
                <AvatarImage
                  src={currentUser.public_url}
                  alt={currentUser.name}
                  className="w-full h-full rounded-full border-2 border-gray-300 object-cover group-hover:opacity-80 transition-opacity"
                  onClick={() => document.getElementById("main-avatar-upload")?.click()}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <AvatarFallback
                  className="bg-blue-100 text-blue-700 font-semibold text-xl md:text-3xl cursor-pointer group-hover:bg-blue-200 transition-colors"
                  onClick={() => document.getElementById("main-avatar-upload")?.click()}
                >
                  {currentUser?.name
                    ? currentUser.name.split(" ")[0][0].toUpperCase()
                    : "?"}
                </AvatarFallback>
              )}
              {/* Edit Icon Overlay */}
              <div
                onClick={() => document.getElementById("main-avatar-upload")?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-30 rounded-full transition-all cursor-pointer"
              >
                <Edit className="w-6 h-6 md:w-8 md:h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Avatar>
          </div>
          <input
            type="file"
            id="main-avatar-upload"
            accept="image/*"
            onChange={handleMainAvatarChange}
            className="hidden"
          />
          <h2 className="text-lg md:text-xl font-semibold mt-3 md:mt-4 font-poppins text-center">
            {currentUser?.name}
          </h2>
          <p className="text-sm md:text-base text-gray-600 font-poppins text-center">
            {currentUser?.email}
          </p>
        </div>

        {/* Right Column - Tabbed Card */}
        <Card className="w-full md:w-2/3 shadow-sm font-poppins p-4 md:p-5">
          <CardHeader className="p-2 md:p-0">
            <Tabs defaultValue="info">
              <TabsList className="grid grid-cols-2 w-full mb-6 md:mb-10">
                <TabsTrigger value="info" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
                  <IdCard className="w-4 h-4 md:w-5 md:h-5" />
                  <span>Information</span>
                </TabsTrigger>
                <TabsTrigger
                  value="password"
                  className="flex items-center gap-1 md:gap-2 text-xs md:text-sm"
                >
                  <Lock className="w-3 h-3 md:w-4 md:h-4" />
                  <span>Password</span>
                </TabsTrigger>
              </TabsList>

              {/* Information Tab */}
              <TabsContent value="info" forceMount>
                <Form {...editForm}>
                  <form
                    onSubmit={editForm.handleSubmit(onSubmitEdit)}
                    className="space-y-3 md:space-y-4"
                  >
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
                              className="text-sm md:text-base"
                              onChange={(e) => {
                                field.onChange(e);
                                handleNameChange(e.target.value);
                              }}
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
                              className="text-sm md:text-base"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                handleEmailChange(e.target.value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        className="bg-blue-900 hover:bg-blue-800 text-sm md:text-base"
                        disabled={!editForm.formState.isValid}
                      >
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>

              {/* Password Tab */}
              <TabsContent value="password">
                <Form {...editForm}>
                  <form
                    onSubmit={editForm.handleSubmit(onSubmitEdit)}
                    className="space-y-3 md:space-y-4"
                  >
                    <FormField
                      control={editForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1">
                            Password
                            <span className="text-xs text-gray-500 font-normal">
                              (optional)
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter new password"
                              className="text-sm md:text-base"
                              {...field}
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
                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        className="bg-blue-900 hover:bg-blue-800 text-sm md:text-base"
                      >
                        Update Password
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>
      </div>

      {/* All Users Section (for superadmin) */}
      {isSuperAdmin() && (
        <div className="w-full sm:px-4 flex justify-center mt-4 sm:mt-6 font-poppins">
          <Card className="w-full p-2 sm:p-4 border-gray-300 bg-white shadow-sm">
            <div className="flex flex-row justify-between items-center gap-3 mb-3 p-2">
              <CardHeader className="text-base sm:text-lg font-semibold p-0">All Users</CardHeader>
              {canAddUser() && (
                <Button
                  className="bg-blue-900 text-white px-2.5 py-1 sm:px-4 sm:py-2 rounded-lg flex items-center hover:bg-blue-800 text-xs sm:text-sm"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <UserPlus2 size={12} className="mr-1 sm:mr-2 sm:size-4" />
                  <span>Add User</span>
                </Button>
              )}
            </div>
            <CardContent className="overflow-x-auto p-1 sm:p-2">
              <div className="min-w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-blue-100 text-blue-900">
                    <tr>
                      <th className="px-2 py-1 sm:px-4 sm:py-2 text-left">Avatar</th>
                      <th className="px-2 py-1 sm:px-4 sm:py-2 text-left">Name</th>
                      <th className="px-2 py-1 sm:px-4 sm:py-2 text-left hidden sm:table-cell">Email</th>
                      <th className="px-2 py-1 sm:px-4 sm:py-2 text-left">Role</th>
                      <th className="px-2 py-1 sm:px-4 sm:py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {displayedUsers.map((user) => (
                      <tr key={user.user_id} className="hover:bg-blue-50">
                        <td className="px-2 py-1 sm:px-4 sm:py-2">
                          <Avatar className="w-6 h-6 sm:w-8 sm:h-8">
                            {user.public_url ? (
                              <AvatarImage
                                src={user.public_url}
                                alt={user.name}
                                className="rounded-full"
                                onError={(e) => (e.currentTarget.style.display = "none")}
                              />
                            ) : (
                              <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-xs sm:text-sm">
                                {user.name?.charAt(0).toUpperCase() ?? "?"}
                              </AvatarFallback>
                            )}
                          </Avatar>
                        </td>
                        <td className="px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm">{user.name}</td>
                        <td className="px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm hidden sm:table-cell">{user.email}</td>
                        <td className="px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm">{user.role}</td>
                        <td className="px-2 py-1 sm:px-4 sm:py-2 flex gap-1 sm:gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditUser(user)}
                            className="h-6 w-6 sm:h-8 sm:w-8"
                          >
                            <Pencil size={12} className="text-blue-900 sm:w-3.5 sm:h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteUser(user)}
                            className="h-6 w-6 sm:h-8 sm:w-8"
                          >
                            <Trash2 size={12} className="text-red-600 sm:w-3.5 sm:h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>

            <CardFooter className="mt-2 sm:mt-4 p-1 sm:p-2">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      className="h-8 w-8 sm:h-10 sm:w-10 mr-8"
                      onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                    />
                  </PaginationItem>
                  {Array.from({ length: pageCount }, (_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        className="h-8 w-8 sm:h-10 sm:w-10 text-xs sm:text-sm"
                        onClick={() => setCurrentPage(i)}
                        isActive={currentPage === i}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      className="h-8 w-8 sm:h-10 sm:w-10"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(pageCount - 1, prev + 1))
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </CardFooter>
          </Card>
        </div>
      )}


      {/* Add User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[95vh]">
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
                <p className="text-xs text-gray-500 mt-1">
                  Upload profile picture
                </p>
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
        <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[95vh]">
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
                <p className="text-xs text-gray-500 mt-1">
                  Update profile picture
                </p>
              </div>

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
                        onChange={(e) => {
                          field.onChange(e); // Update the form state
                          handleNameChange(e.target.value); // Track changes
                        }}
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
                        onChange={(e) => {
                          field.onChange(e); // Update the form state
                          handleEmailChange(e.target.value); // Track changes
                        }}
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
