import { useEffect, useState } from "react";
import { supabase } from "../utils/supa";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

// Define the form schema
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.string().min(1, "Role is required"),
});

// Define the type for user data
interface UserData {
  name: string;
  email: string;
}

export default function Users() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "",
    },
  });

  const fetchUsers = async () => {
    const { data, error } = await supabase.from("users").select("name, email");

    if (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } else {
      setUsers(data || []); 
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Create user in Supabase Auth first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            name: values.name,
            role: values.role,
          }
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
        // If database insert fails, we should ideally delete the auth user
        // but this requires admin rights in Supabase
        throw dbError;
      }

      toast.success("User added successfully");
      setIsDialogOpen(false);
      form.reset();
      fetchUsers(); // Refresh the users list
    } catch (error: any) {
      console.error("Error adding user:", error);
      toast.error(error.message || "Failed to add user");
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-medium font-poppins text-blue-900">
          Accounts
        </h1>
        <Button
          className="bg-blue-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-800"
          onClick={() => setIsDialogOpen(true)}
        >
          <Plus size={16} /> Add User
        </Button>
      </div>
      <hr className="border-gray-300 border-1 mb-6" />
      <div className="mt-4">
        {users.length > 0 ? (
          users.map((user, index) => (
            <div key={index} className="flex items-center mb-4">
              <img src="/assets/RACU.png" alt="Avatar" width="90" height="90" className="rounded-full mr-4" />
              <div className="flex flex-col">
                <span className="text-xl font-semibold font-poppins text-gray-800">{user.name}</span>
                <span className="text-sm font-poppins text-gray-600">{user.email}</span>
              </div>
            </div>
          ))
        ) : (
          <span className="text-sm font-poppins text-gray-600">Loading...</span>
        )}
      </div>

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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter password" {...field} />
                    </FormControl>
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
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                  Add User
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}