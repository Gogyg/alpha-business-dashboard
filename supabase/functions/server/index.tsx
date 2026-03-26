import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const app = new Hono();

// Create Supabase client
const getSupabaseClient = (accessToken?: string) => {
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );
  
  if (accessToken) {
    return createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      }
    );
  }
  
  return client;
};

const getSupabaseAdmin = () => {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
};

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-4787ef03/health", (c) => {
  return c.json({ status: "ok" });
});

// Auth endpoints
app.post("/make-server-4787ef03/auth/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true // Auto-confirm since email server not configured
    });
    
    if (error) {
      console.error("Signup error:", error);
      return c.json({ error: error.message }, 400);
    }
    
    return c.json({ user: data.user });
  } catch (error) {
    console.error("Signup exception:", error);
    return c.json({ error: "Failed to create user" }, 500);
  }
});

app.post("/make-server-4787ef03/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error("Login error:", error);
      return c.json({ error: error.message }, 400);
    }
    
    return c.json({ 
      session: data.session,
      user: data.user 
    });
  } catch (error) {
    console.error("Login exception:", error);
    return c.json({ error: "Failed to login" }, 500);
  }
});

// VOC Metrics endpoints
app.get("/make-server-4787ef03/voc/:quarter", async (c) => {
  try {
    const quarter = c.req.param("quarter");
    const data = await kv.get(`voc_${quarter}`);
    return c.json({ data: data || null });
  } catch (error) {
    console.error("Get VOC error:", error);
    return c.json({ error: "Failed to get VOC data" }, 500);
  }
});

app.post("/make-server-4787ef03/voc/:quarter", async (c) => {
  try {
    const quarter = c.req.param("quarter");
    const data = await c.req.json();
    
    await kv.set(`voc_${quarter}`, data);
    return c.json({ success: true });
  } catch (error) {
    console.error("Save VOC error:", error);
    return c.json({ error: "Failed to save VOC data" }, 500);
  }
});

// Important Metrics endpoints
app.get("/make-server-4787ef03/metrics/:quarter", async (c) => {
  try {
    const quarter = c.req.param("quarter");
    const data = await kv.get(`metrics_${quarter}`);
    return c.json({ data: data || [] });
  } catch (error) {
    console.error("Get metrics error:", error);
    return c.json({ error: "Failed to get metrics data" }, 500);
  }
});

app.post("/make-server-4787ef03/metrics/:quarter", async (c) => {
  try {
    const quarter = c.req.param("quarter");
    const data = await c.req.json();
    
    await kv.set(`metrics_${quarter}`, data);
    return c.json({ success: true });
  } catch (error) {
    console.error("Save metrics error:", error);
    return c.json({ error: "Failed to save metrics data" }, 500);
  }
});

// Goals endpoints
app.get("/make-server-4787ef03/goals/:quarter", async (c) => {
  try {
    const quarter = c.req.param("quarter");
    const data = await kv.get(`goals_${quarter}`);
    return c.json({ data: data || [] });
  } catch (error) {
    console.error("Get goals error:", error);
    return c.json({ error: "Failed to get goals data" }, 500);
  }
});

app.post("/make-server-4787ef03/goals/:quarter", async (c) => {
  try {
    const quarter = c.req.param("quarter");
    const data = await c.req.json();
    
    await kv.set(`goals_${quarter}`, data);
    return c.json({ success: true });
  } catch (error) {
    console.error("Save goals error:", error);
    return c.json({ error: "Failed to save goals data" }, 500);
  }
});

// Team data endpoint
app.get("/make-server-4787ef03/team", async (c) => {
  try {
    const data = await kv.get("team_data");
    return c.json({ data: data || [] });
  } catch (error) {
    console.error("Get team error:", error);
    return c.json({ error: "Failed to get team data" }, 500);
  }
});

app.post("/make-server-4787ef03/team", async (c) => {
  try {
    const data = await c.req.json();
    
    await kv.set("team_data", data);
    return c.json({ success: true });
  } catch (error) {
    console.error("Save team error:", error);
    return c.json({ error: "Failed to save team data" }, 500);
  }
});

Deno.serve(app.fetch);