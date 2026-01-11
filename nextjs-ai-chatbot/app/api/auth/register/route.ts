import { NextResponse } from "next/server";
import { z } from "zod";
import { createUser, getUser } from "@/lib/db/queries";
import { type User } from "@/lib/db/schema";
import { genSaltSync, hashSync } from "bcrypt-ts";

const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  try {
    console.log("on auth/register req");
    const body = await req.json();
    const validatedData = authFormSchema.parse(body);

    console.log("validatedData", validatedData);
    const existingUsers = await getUser(validatedData.email);
    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    await createUser(validatedData.email, validatedData.password);
    const [newUser] = await getUser(validatedData.email);

    // Generate a simple token for React Native
    const token = Buffer.from(`${newUser.id}:${Date.now()}`).toString("base64");

    return NextResponse.json(
      {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
