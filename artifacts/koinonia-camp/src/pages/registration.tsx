import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useSubmitRegistration,
  RegistrationInput,
} from "@workspace/api-client-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Tent,
  MapPin,
  Bus,
  Utensils,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import flyerBg from "@assets/6fbb5613-c955-4bb3-b4eb-f71d5d3d0779_1785106584113.jpeg";

const BRANCHES = ["Accra Main (Okponglo)", "Tema", "Campus Church (Legon)"];

const MINISTRIES = [
  "Prayer",
  "Media and Communication",
  "Sherfields & NMC",
  "Outreach",
  "Music",
  "Gold Club",
  "Hospitality",
  "Finance",
  "Expressions of Grace",
  "Teens",
  "Little Lambs",
  "Other",
];

const registrationSchema = z
  .object({
    fullName: z.string().min(2, "Full name is required"),
    ageCategory: z.enum(["Adult", "Teen", "Child"], {
      required_error: "Please select an option",
    }),
    phoneNumber: z.string().min(9, "Phone number is required"),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    gender: z.enum(["Male", "Female"], {
      required_error: "Please select a gender",
    }),
    branch: z.string().min(1, "Please select a branch"),
    ministries: z.array(z.string()).min(1, "Please select at least one option"),
    emergencyContactName: z.string().min(2, "Emergency contact name required"),
    emergencyContactNumber: z
      .string()
      .min(9, "Emergency contact number required"),
    accommodationPreference: z.enum(["Resident", "Non-Resident"], {
      required_error: "Select accommodation preference",
    }),
    roomTypePreference: z.string().optional(),
    lodgingType: z.string().optional(),
    roommatePreferences: z.string().optional(),
    specialNeeds: z.string().optional(),
    feedingPreference: z.enum(["Church Feeding", "Self Feeding"], {
      required_error: "Select feeding preference",
    }),
    transportPreference: z.enum(["Church Bus", "Self Transport"], {
      required_error: "Select transport preference",
    }),
  })
  .superRefine((data, ctx) => {
    if (data.accommodationPreference === "Resident") {
      if (!data.roomTypePreference) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please select a room type",
          path: ["roomTypePreference"],
        });
      }
      if (!data.lodgingType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please select a lodging type",
          path: ["lodgingType"],
        });
      }
    }
  });

type RegistrationFormValues = z.infer<typeof registrationSchema>;

export default function Registration() {
  const [step, setStep] = useState(1);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null);
  const [otherMinistryText, setOtherMinistryText] = useState("");
  const { toast } = useToast();

  const submitRegistration = useSubmitRegistration();

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      fullName: "",
      ageCategory: undefined,
      phoneNumber: "",
      email: "",
      gender: undefined,
      branch: "",
      ministries: [],
      emergencyContactName: "",
      emergencyContactNumber: "",
      accommodationPreference: undefined,
      roomTypePreference: "",
      lodgingType: "",
      roommatePreferences: "",
      specialNeeds: "",
      feedingPreference: undefined,
      transportPreference: undefined,
    },
    mode: "onChange",
  });

  const nextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 1) {
      fieldsToValidate = [
        "fullName",
        "phoneNumber",
        "email",
        "gender",
        "ageCategory",
      ];
    } else if (step === 2) {
      fieldsToValidate = [
        "branch",
        "ministries",
        "emergencyContactName",
        "emergencyContactNumber",
      ];
    }

    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid) {
      setStep((s) => s + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo(0, 0);
  };

  const onSubmit = (data: RegistrationFormValues) => {
    const resolvedMinistries = data.ministries.map((m) =>
      m === "Other" && otherMinistryText.trim()
        ? `Other: ${otherMinistryText.trim()}`
        : m,
    );
    const payload: RegistrationInput = {
      fullName: data.fullName,
      ageCategory: data.ageCategory,
      phoneNumber: data.phoneNumber,
      email: data.email || undefined,
      gender: data.gender,
      branch: data.branch,
      ministries: resolvedMinistries,
      emergencyContactName: data.emergencyContactName,
      emergencyContactNumber: data.emergencyContactNumber,
      accommodationPreference: data.accommodationPreference,
      roomTypePreference: data.roomTypePreference || undefined,
      lodgingType: data.lodgingType || undefined,
      roommatePreferences: data.roommatePreferences || undefined,
      specialNeeds: data.specialNeeds || undefined,
      feedingPreference: data.feedingPreference,
      transportPreference: data.transportPreference,
    };

    submitRegistration.mutate(
      { data: payload },
      {
        onSuccess: (res) => {
          setReferenceNumber(res.referenceNumber);
          window.scrollTo(0, 0);
        },
        onError: (err: any) => {
          toast({
            title: "Registration Failed",
            description:
              err?.error || "Something went wrong. Please try again.",
            variant: "destructive",
          });
        },
      },
    );
  };

  if (referenceNumber) {
    return (
      <div className="min-h-[100dvh] w-full bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2rem] shadow-xl p-8 text-center animate-in zoom-in-95 duration-500 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-32 bg-primary/5 rounded-b-[50%] -z-10" />

          <div className="mx-auto w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-sm ring-8 ring-green-50">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h2 className="text-3xl font-serif font-bold text-foreground mb-2">
            You're Registered!
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            We can't wait to see you at camp.
          </p>

          <div className="bg-accent/30 border border-accent rounded-2xl p-6 mb-8 relative">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-2">
              Reference Number
            </p>
            <p className="text-4xl font-mono font-bold text-primary tracking-tight">
              {referenceNumber}
            </p>
          </div>

          <div className="space-y-3 text-sm text-foreground bg-gray-50 rounded-xl p-5 text-left border border-gray-100">
            <div className="flex items-center gap-3">
              <Tent className="w-4 h-4 text-secondary" />
              <span className="font-medium">Koinonia Camp 2026</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-secondary" />
              <span>Sept 18-21, 2026</span>
            </div>
          </div>

          <a
            href="/my-registration"
            className="block mt-4 text-sm text-primary font-medium hover:underline"
          >
            View my registration anytime →
          </a>
        </div>
      </div>
    );
  }

  const isResident = form.watch("accommodationPreference") === "Resident";

  return (
    <div className="min-h-[100dvh] w-full bg-background flex flex-col md:flex-row relative">
      <div className="hidden md:flex flex-1 relative bg-primary">
        <img
          src={flyerBg}
          alt="Camp Background"
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/50 to-transparent" />
        <div className="relative z-10 flex flex-col justify-end p-12 text-white h-full max-w-2xl">
          <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary w-fit mb-6 text-sm py-1.5 px-4 rounded-full border-none">
            Sept 18-21, 2026
          </Badge>
          <h1 className="text-6xl font-serif font-bold leading-tight mb-4 text-white">
            Prepare to meet thy God.
          </h1>
          <p className="text-2xl text-primary-foreground/80 font-medium">
            Koinonia Camp 2026
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-[100dvh] overflow-y-auto">
        <div className="md:hidden relative h-64 overflow-hidden flex-shrink-0">
          <img
            src={flyerBg}
            alt="Camp Background"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-primary/60 to-background" />
          <div className="absolute bottom-6 left-6 right-6">
            <h1 className="text-3xl font-serif font-bold text-white mb-2 leading-tight">
              Koinonia Camp
            </h1>
            <p className="text-white/90 text-sm font-medium">
              Prepare to meet thy God
            </p>
          </div>
        </div>

          href="/my-registration"
            className="flex items-center justify-between gap-2 mb-6 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors group"
          >
            <span className="text-sm font-medium text-primary">
              Already registered? View your details →
            </span>
          </a>

          <div className="mb-8 hidden md:block">
            <h2 className="text-3xl font-bold text-foreground">Register</h2>
            <p className="text-muted-foreground mt-2">Takes less than 2 minutes.</p>
          </div>

          <div className="md:hidden mb-6">
            <h2 className="text-2xl font-bold text-foreground">Registration</h2>
          </div>

          <div className="md:hidden mb-4 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-foreground">Registration</h2>
            <a
              href="/my-registration"
              className="text-xs text-primary font-medium hover:underline"
            >
              Already registered?
            </a>
          </div>

          <div className="md:hidden mb-6 flex justify-end items-end">
            <span className="text-sm font-medium text-secondary">Step {step} of 3</span>
          </div>

          <div className="flex gap-2 mb-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  step >= i ? "bg-secondary" : "bg-secondary/20"
                }`}
              />
            ))}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div
                className={
                  step === 1
                    ? "block animate-in slide-in-from-right-4 duration-300"
                    : "hidden"
                }
              >
                <div className="space-y-5">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Full Name <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="John Doe"
                            className="h-12 bg-white"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Phone Number{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="055 000 0000"
                            className="h-12 bg-white"
                            {...field}
                          />
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
                        <FormLabel>Email Address (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="john@example.com"
                            className="h-12 bg-white"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>
                          Gender <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex gap-4"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0 bg-white border rounded-xl p-4 flex-1 cursor-pointer [&:has([data-state=checked])]:border-secondary [&:has([data-state=checked])]:ring-1 [&:has([data-state=checked])]:ring-secondary">
                              <FormControl>
                                <RadioGroupItem value="Male" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer w-full">
                                Male
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0 bg-white border rounded-xl p-4 flex-1 cursor-pointer [&:has([data-state=checked])]:border-secondary [&:has([data-state=checked])]:ring-1 [&:has([data-state=checked])]:ring-secondary">
                              <FormControl>
                                <RadioGroupItem value="Female" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer w-full">
                                Female
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ageCategory"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>
                          Are you an Adult, Teen, or Child?{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-3 gap-2"
                          >
                            {["Adult", "Teen", "Child"].map((type) => (
                              <FormItem
                                key={type}
                                className="flex items-center space-x-2 space-y-0 bg-white border rounded-xl p-4 cursor-pointer [&:has([data-state=checked])]:border-secondary [&:has([data-state=checked])]:ring-1 [&:has([data-state=checked])]:ring-secondary"
                              >
                                <FormControl>
                                  <RadioGroupItem value={type} />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer w-full text-sm">
                                  {type}
                                </FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="button"
                  onClick={nextStep}
                  className="w-full h-12 mt-8 text-lg rounded-xl"
                >
                  Next Step
                  <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </div>

              <div
                className={
                  step === 2
                    ? "block animate-in slide-in-from-right-4 duration-300"
                    : "hidden"
                }
              >
                <div className="space-y-5">
                  <FormField
                    control={form.control}
                    name="branch"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Branch <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-12 bg-white">
                              <SelectValue placeholder="Select your branch" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BRANCHES.map((b) => (
                              <SelectItem key={b} value={b}>
                                {b}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ministries"
                    render={() => (
                      <FormItem>
                        <div className="mb-3">
                          <FormLabel>
                            Ministries{" "}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <p className="text-sm text-muted-foreground mt-1">
                            Select all that apply
                          </p>
                        </div>
                        <div className="grid grid-cols-1 gap-2 pr-2">
                          {MINISTRIES.map((item) => (
                            <FormField
                              key={item}
                              control={form.control}
                              name="ministries"
                              render={({ field }) => (
                                <FormItem
                                  key={item}
                                  className="flex flex-row items-start space-x-3 space-y-0 bg-white border rounded-lg p-3 cursor-pointer [&:has([data-state=checked])]:border-primary"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(item)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([
                                              ...field.value,
                                              item,
                                            ])
                                          : field.onChange(
                                              field.value?.filter(
                                                (v) => v !== item,
                                              ),
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer w-full text-sm">
                                    {item}
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        {form.watch("ministries")?.includes("Other") && (
                          <div className="animate-in slide-in-from-top-2 fade-in duration-200 mt-2">
                            <Input
                              placeholder="Please specify your ministry..."
                              className="h-11 bg-white"
                              value={otherMinistryText}
                              onChange={(e) =>
                                setOtherMinistryText(e.target.value)
                              }
                            />
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4 border-t space-y-5">
                    <h3 className="font-medium text-foreground">
                      Emergency Contact
                    </h3>
                    <FormField
                      control={form.control}
                      name="emergencyContactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Name <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Relation's name"
                              className="h-12 bg-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="emergencyContactNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Phone Number{" "}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="055 000 0000"
                              className="h-12 bg-white"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    className="h-12 px-4 rounded-xl"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="flex-1 h-12 text-lg rounded-xl"
                  >
                    Next Step
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
                </div>
              </div>

              <div
                className={
                  step === 3
                    ? "block animate-in slide-in-from-right-4 duration-300"
                    : "hidden"
                }
              >
                <div className="space-y-8">
                  <FormField
                    control={form.control}
                    name="accommodationPreference"
                    render={({ field }) => (
                      <FormItem className="space-y-4">
                        <div className="flex items-center gap-2 text-primary mb-1">
                          <Tent className="w-5 h-5" />
                          <FormLabel className="text-base font-semibold">
                            Accommodation{" "}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                        </div>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-1 md:grid-cols-2 gap-3"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0 bg-white border rounded-xl p-4 cursor-pointer [&:has([data-state=checked])]:border-secondary [&:has([data-state=checked])]:ring-1 [&:has([data-state=checked])]:ring-secondary transition-all">
                              <FormControl>
                                <RadioGroupItem value="Resident" />
                              </FormControl>
                              <div className="flex flex-col">
                                <FormLabel className="font-semibold cursor-pointer">
                                  Resident
                                </FormLabel>
                                <span className="text-xs text-muted-foreground mt-0.5">
                                  Staying at the camp grounds
                                </span>
                              </div>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0 bg-white border rounded-xl p-4 cursor-pointer [&:has([data-state=checked])]:border-secondary [&:has([data-state=checked])]:ring-1 [&:has([data-state=checked])]:ring-secondary transition-all">
                              <FormControl>
                                <RadioGroupItem value="Non-Resident" />
                              </FormControl>
                              <div className="flex flex-col">
                                <FormLabel className="font-semibold cursor-pointer">
                                  Non-Resident
                                </FormLabel>
                                <span className="text-xs text-muted-foreground mt-0.5">
                                  Commuting daily
                                </span>
                              </div>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isResident && (
                    <div className="animate-in slide-in-from-top-2 fade-in duration-200 pl-4 border-l-2 border-secondary/30 ml-2 space-y-5">
                      <FormField
                        control={form.control}
                        name="roomTypePreference"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-sm font-medium">
                              Room Sharing{" "}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                              >
                                {["Single", "Double", "Four Sharing"].map(
                                  (type) => (
                                    <FormItem
                                      key={type}
                                      className="flex items-center space-x-2 space-y-0 bg-white border rounded-lg p-3 cursor-pointer [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                                    >
                                      <FormControl>
                                        <RadioGroupItem value={type} />
                                      </FormControl>
                                      <FormLabel className="font-normal cursor-pointer text-sm w-full">
                                        {type}
                                      </FormLabel>
                                    </FormItem>
                                  ),
                                )}
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {(form.watch("roomTypePreference") === "Double" ||
                        form.watch("roomTypePreference") ===
                          "Four Sharing") && (
                        <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                          <FormField
                            control={form.control}
                            name="roommatePreferences"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">
                                  Preferred Roommates{" "}
                                  <span className="text-muted-foreground font-normal">
                                    (Optional)
                                  </span>
                                </FormLabel>
                                <p className="text-xs text-muted-foreground -mt-1">
                                  Names of people you'd like to share a room
                                  with, one per line.
                                </p>
                                <FormControl>
                                  <Textarea
                                    placeholder={
                                      "e.g.\nAkosua Mensah\nKofi Asante"
                                    }
                                    className="bg-white resize-none min-h-[90px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      <FormField
                        control={form.control}
                        name="lodgingType"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel className="text-sm font-medium">
                              Lodging Type{" "}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                              >
                                {["Airbnb", "Hostel", "Hotel"].map((type) => (
                                  <FormItem
                                    key={type}
                                    className="flex items-center space-x-2 space-y-0 bg-white border rounded-lg p-3 cursor-pointer [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                                  >
                                    <FormControl>
                                      <RadioGroupItem value={type} />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer text-sm w-full">
                                      {type}
                                    </FormLabel>
                                  </FormItem>
                                ))}
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="feedingPreference"
                    render={({ field }) => (
                      <FormItem className="space-y-4">
                        <div className="flex items-center gap-2 text-primary mb-1">
                          <Utensils className="w-5 h-5" />
                          <FormLabel className="text-base font-semibold">
                            Feeding <span className="text-destructive">*</span>
                          </FormLabel>
                        </div>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-1 md:grid-cols-2 gap-3"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0 bg-white border rounded-xl p-4 cursor-pointer [&:has([data-state=checked])]:border-secondary [&:has([data-state=checked])]:ring-1 [&:has([data-state=checked])]:ring-secondary">
                              <FormControl>
                                <RadioGroupItem value="Church Feeding" />
                              </FormControl>
                              <FormLabel className="font-semibold cursor-pointer w-full">
                                Church Feeding
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0 bg-white border rounded-xl p-4 cursor-pointer [&:has([data-state=checked])]:border-secondary [&:has([data-state=checked])]:ring-1 [&:has([data-state=checked])]:ring-secondary">
                              <FormControl>
                                <RadioGroupItem value="Self Feeding" />
                              </FormControl>
                              <FormLabel className="font-semibold cursor-pointer w-full">
                                Self Feeding
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="transportPreference"
                    render={({ field }) => (
                      <FormItem className="space-y-4">
                        <div className="flex items-center gap-2 text-primary mb-1">
                          <Bus className="w-5 h-5" />
                          <FormLabel className="text-base font-semibold">
                            Transport{" "}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                        </div>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-1 md:grid-cols-2 gap-3"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0 bg-white border rounded-xl p-4 cursor-pointer [&:has([data-state=checked])]:border-secondary [&:has([data-state=checked])]:ring-1 [&:has([data-state=checked])]:ring-secondary">
                              <FormControl>
                                <RadioGroupItem value="Church Bus" />
                              </FormControl>
                              <FormLabel className="font-semibold cursor-pointer w-full">
                                Church Bus
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0 bg-white border rounded-xl p-4 cursor-pointer [&:has([data-state=checked])]:border-secondary [&:has([data-state=checked])]:ring-1 [&:has([data-state=checked])]:ring-secondary">
                              <FormControl>
                                <RadioGroupItem value="Self Transport" />
                              </FormControl>
                              <FormLabel className="font-semibold cursor-pointer w-full">
                                Self Transport
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="specialNeeds"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2 text-primary mb-1">
                          <FormLabel className="text-base font-semibold">
                            Special Needs{" "}
                            <span className="text-muted-foreground font-normal text-sm">
                              (Optional)
                            </span>
                          </FormLabel>
                        </div>
                        <p className="text-sm text-muted-foreground -mt-1">
                          Any special requirements for busing or rooming we
                          should know about?
                        </p>
                        <FormControl>
                          <Textarea
                            placeholder="e.g. I need a ground-floor room, or I require a specific pickup point for the bus..."
                            className="bg-white resize-none min-h-[90px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-3 mt-10">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    className="h-12 px-4 rounded-xl"
                    disabled={submitRegistration.isPending}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-12 text-lg rounded-xl"
                    disabled={submitRegistration.isPending}
                  >
                    {submitRegistration.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Complete Registration
                        <CheckCircle2 className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 4px;
        }
      `,
        }}
      />
    </div>
  );
}