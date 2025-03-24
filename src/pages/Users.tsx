import { useEffect, useState, useRef } from "react";
import { supabase } from "../utils/supa";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, AlertCircle, ShieldAlert, Info } from "lucide-react";
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
import HCaptcha from '@hcaptcha/react-hcaptcha';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Cookies from "js-cookie";

// Define the form schema
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .or(z.literal(""))
    .optional(),
  role: z.string().min(1, "Role is required"),
});

// Define the edit form schema (password is optional for editing)
const editFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .or(z.literal(""))
    .optional(),
  role: z.string().min(1, "Role is required"),
});

// Define the type for user data
interface UserData {
  user_id?: number | string;  // Could be either number or string depending on DB
  uuid?: string;
  name: string;
  email: string;
  role?: string;
}

// Current user type
interface CurrentUser {
  id: string;
  email: string;
  role: string;
  name?: string;
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
      // Get current user from auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error("Error fetching current user:", authError);
        return;
      }
      
      // Get user details from users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("uuid", user.id)
        .single();
      
      if (userError) {
        console.error("Error fetching user details:", userError);
        return;
      }
      
      setCurrentUser({
        id: user.id,
        email: user.email || "",
        role: userData?.role || user.user_metadata?.role || "",
        name: userData?.name || user.user_metadata?.name || "",
      });
      
    } catch (error) {
      console.error("Error in fetchCurrentUser:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      // First, check the users table structure
      const { data: checkData, error: checkError } = await supabase
        .from("users")
        .select("*")
        .limit(1);
      
      if (checkError) {
        console.error("Error checking users table:", checkError);
        toast.error("Failed to check users table structure");
        return;
      }

      // Determine what columns exist in the table
      const firstUser = checkData?.[0] as Record<string, unknown> | undefined;
      const hasUserId = firstUser && 'user_id' in firstUser;
      const hasId = firstUser && 'id' in firstUser;
      
      // Build select query based on available columns
      let selectQuery = "";
      if (hasUserId) {
        selectQuery = "user_id";
      } else if (hasId) {
        selectQuery = "id";
      } else {
        selectQuery = "*"; // Fallback to all columns
      }
      selectQuery += ", uuid, name, email, role";
      
      // Get all users with the appropriate query
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select(selectQuery);

      if (userError) {
        console.error("Error fetching users:", userError);
        toast.error("Failed to fetch users");
        return;
      }
      
      if (!userData) {
        setUsers([]);
        return;
      }
      
      // Map the data to ensure consistent UserData interface
      const mappedUsers = userData.map((user: Record<string, any>) => ({
        user_id: user.user_id || user.id, // Use either user_id or id
        uuid: user.uuid,
        name: user.name,
        email: user.email,
        role: user.role
      }));
      
      setUsers(mappedUsers);
    } catch (fetchError: unknown) {
      console.error("Error in fetchUsers:", fetchError);
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

      // Create user in Supabase Auth first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password as string,
        options: {
          data: {
            name: values.name,
            role: values.role,
          },
          captchaToken: captchaToken
        }
      });

      if (authError) throw authError;

      if (!authData.user?.id) {
        throw new Error("Failed to create user");
      }

      // Create user in your custom users table with the UUID
      const { error: dbError } = await supabase.from("users").insert([
        {
          name: values.name,
          email: values.email,
          password: values.password, // This will be hashed by the trigger
          role: values.role,
          uuid: authData.user.id // Link to the auth user
        },
      ]);

      if (dbError) {
        console.error("Database error:", dbError);
        throw dbError;
      }

      toast.success("User added successfully");
      setIsDialogOpen(false);
      form.reset();
      fetchUsers(); // Refresh the users list
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
    if (!canEditUser(user)) {
      showPermissionDenied();
      return;
    }

    setSelectedUser(user);
    editForm.reset({
      name: user.name,
      email: user.email,
      password: "", // Empty string means "no change to password"
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

      // Check permissions again before submitting
      if (!canEditUser(selectedUser)) {
        showPermissionDenied();
        return;
      }

      // Non-superadmin users can't change their role
      const updateRole = isSuperAdmin() ? values.role : selectedUser.role;

      // Update user in your custom users table first
      const updateData: any = {
        name: values.name,
        email: values.email,
        role: updateRole,
      };
      
      // Only add password to update if it's not empty
      const hasProvidedPassword = values.password && values.password.trim().length > 0;
      if (hasProvidedPassword) {
        updateData.password = values.password;
      }

      // Update the database record
      const { error: dbError } = await supabase
        .from("users")
        .update(updateData)
        .eq("user_id", selectedUser.user_id);

      if (dbError) {
        console.error("Database error:", dbError);
        throw dbError;
      }

      // If user is updating their own account, update the auth metadata and cookies
      // This works because a user can update their own auth record
      if (isOwnAccount(selectedUser)) {
        // Create auth update data object without password
        const authUpdateData: any = {
          email: values.email,
          data: {
            name: values.name,
            role: updateRole,
          }
        };

        // Only include password in update if it's actually provided
        if (hasProvidedPassword) {
          authUpdateData.password = values.password;
        }

        // Submit the update
        const { error: authError } = await supabase.auth.updateUser(authUpdateData);

        if (authError) {
          console.error("Auth update error:", authError);
          toast.warning("User details updated but authentication profile could not be updated.");
        } else {
          // Update the user_data cookie to reflect the changes immediately
          try {
            const currentUserData = JSON.parse(Cookies.get('user_data') || '{}');
            const updatedUserData = {
              ...currentUserData,
              name: values.name,
              email: values.email,
              role: updateRole
            };
            Cookies.set('user_data', JSON.stringify(updatedUserData));
          } catch (cookieError) {
            console.error("Error updating user cookie:", cookieError);
          }
        }
      } else if (isSuperAdmin()) {
        // If a superadmin is editing someone else, we can't update their auth directly
        
        // But if the user we're editing is currently logged in on this browser,
        // we should update their cookie data to reflect the changes
        try {
          const currentUserData = JSON.parse(Cookies.get('user_data') || '{}');
          
          // Check if the edited user is the one currently logged in
          if (currentUserData.uuid === selectedUser.uuid) {
            const updatedUserData = {
              ...currentUserData,
              name: values.name,
              email: values.email,
              role: updateRole
            };
            Cookies.set('user_data', JSON.stringify(updatedUserData));
            toast.info("User session data updated. Changes will be reflected immediately.", {
              duration: 3000,
            });
          } else {
            toast.info("User database record updated. Auth record may need server-side update.", {
              duration: 5000,
            });
          }
        } catch (cookieError) {
          console.error("Error checking/updating user cookie:", cookieError);
          toast.info("User database record updated. Auth record may need server-side update.", {
            duration: 5000,
          });
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
        console.error("Database error:", dbError);
        throw dbError;
      }

      toast.success("User deleted from database", {
        description: "Note: The authentication record may require server-side deletion by an administrator."
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-medium font-poppins text-blue-900">
          Accounts
        </h1>
        {canAddUser() ? (
          <Button
            className="bg-blue-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-800"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus size={16} /> Add User
          </Button>
        ) : null}
      </div>
      <hr className="border-gray-300 border-1 mb-6" />
      
      {currentUser?.role !== "superadmin" && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6 text-blue-800 flex items-center gap-2">
          <Info size={18} />
          <p className="text-sm">You can only edit your own account information.</p>
        </div>
      )}
      
      {currentUser?.role === "superadmin" && (
        <div className="bg-amber-50 p-4 rounded-lg mb-6 text-amber-800 flex items-start gap-2">
          <ShieldAlert size={18} className="mt-0.5" />
          <div>
            <p className="text-sm font-medium">Administrator Notice</p>
            <p className="text-sm">
              Client-side user management has limitations. You can add users and update database records, 
              but some authentication operations may require server-side functions with admin privileges.
            </p>
          </div>
        </div>
      )}
      
      <div className="mt-4">
        {users.length > 0 ? (
          users.map((user, index) => (
            <div key={index} className="flex items-center justify-between mb-4 p-4 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center">
                <img src="/assets/RACU.png" alt="Avatar" width="90" height="90" className="rounded-full mr-4" />
                <div className="flex flex-col">
                  <span className="text-xl font-semibold font-poppins text-gray-800">
                    {user.name}
                    {isOwnAccount(user) && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full ml-2">
                        You
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-poppins text-gray-600">{user.email}</span>
                  <span className="text-xs font-poppins text-gray-600 mt-1 px-2 py-1 bg-gray-200 rounded-full inline-block w-fit">
                    {user.role}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditUser(user)}
                        className={`hover:bg-blue-100 ${!canEditUser(user) ? 'opacity-50' : ''}`}
                      >
                        <Pencil size={16} className="text-blue-900" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {canEditUser(user) ? 'Edit user' : 'You can only edit your own account'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDeleteUser(user)}
                        className={`hover:bg-red-100 ${!canDeleteUser(user) ? 'opacity-50' : ''}`}
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {canDeleteUser(user) ? 'Delete user' : 'Only superadmins can delete users'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          ))
        ) : (
          <span className="text-sm font-poppins text-gray-600">Loading...</span>
        )}
      </div>

      {/* Add User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      <Input type="email" placeholder="Enter email" {...field} />
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
                    <FormLabel>Password <span className="text-red-500">*</span></FormLabel>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4">
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
                      <Input type="email" placeholder="Enter email" {...field} />
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
                      Only enter a password if you want to change it. Leave empty to keep current password.
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
                      <p className="text-xs text-gray-500 mt-1">Only superadmins can change roles.</p>
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
              Are you sure you want to delete {selectedUser?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
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
      <Dialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
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
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsPermissionDialogOpen(false)}
            >
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}