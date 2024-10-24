// src/app/api/hello/route.ts
import { getRequestContext } from "@cloudflare/next-on-pages";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Define your data model interfaces to match your schema
interface Customer {
  CustomerId: number;
  CompanyName: string;
  ContactName: string;
}

// Define request payload types
interface CreateCustomerPayload {
  CompanyName: string;
  ContactName: string;
}

interface UpdateCustomerPayload {
  CustomerId: number;
  CompanyName?: string;
  ContactName?: string;
}

// Type for the database binding
interface Env {
  DB: D1Database;
}

// Helper function to get database instance
function getDatabase(): D1Database {
  const { env } = getRequestContext();
  return (env as unknown as Env).DB;
}

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();

    const { results } = await db
      .prepare("SELECT * FROM Customers ORDER BY CustomerId")
      .all<Customer>();

    return Response.json({ data: results });
  } catch (error) {
    console.error("Database error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDatabase();
    const data = (await request.json()) as CreateCustomerPayload;

    // Validate required fields
    if (!data.CompanyName || !data.ContactName) {
      return Response.json(
        { error: "CompanyName and ContactName are required" },
        { status: 400 }
      );
    }

    const { success, meta } = await db
      .prepare(
        "INSERT INTO Customers (CompanyName, ContactName) VALUES (?, ?)"
      )
      .bind(data.CompanyName, data.ContactName)
      .run();

    return Response.json({
      success,
      CustomerId: meta?.last_row_id,
    });
  } catch (error) {
    console.error("Database error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const db = getDatabase();
    const data = (await request.json()) as UpdateCustomerPayload;

    if (!data.CustomerId) {
      return Response.json({ error: "CustomerId is required" }, { status: 400 });
    }

    // Build dynamic update query based on provided fields
    const updates: string[] = [];
    const values: any[] = [];

    if (data.CompanyName !== undefined) {
      updates.push("CompanyName = ?");
      values.push(data.CompanyName);
    }
    if (data.ContactName !== undefined) {
      updates.push("ContactName = ?");
      values.push(data.ContactName);
    }

    if (updates.length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(data.CustomerId);

    const { success } = await db
      .prepare(`UPDATE Customers SET ${updates.join(", ")} WHERE CustomerId = ?`)
      .bind(...values)
      .run();

    return Response.json({ success });
  } catch (error) {
    console.error("Database error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = getDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("CustomerId");

    if (!id) {
      return Response.json({ error: "CustomerId is required" }, { status: 400 });
    }

    const { success } = await db
      .prepare("DELETE FROM Customers WHERE CustomerId = ?")
      .bind(id)
      .run();

    return Response.json({ success });
  } catch (error) {
    console.error("Database error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}