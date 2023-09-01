import { ResourceLoader } from "../helpers/loader.ts";
import postgres from "$postgres";
import * as supabase from "supabase";
import type { MessageView } from "./types.ts";

export interface DatabaseUser {
  userId: number;
  userName: string;
  avatarUrl: string;
}

export class Database {
  #client: supabase.SupabaseClient;

  constructor(client?: supabase.SupabaseClient) {
    this.#client = client ?? supabase.createClient(
      Deno.env.get("SUPABASE_API_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
  }

  async insertUser(user: DatabaseUser & { accessToken: string }) {
    const { error } = await this.#client
      .from("users")
      .upsert([
        {
          id: user.userId,
          username: user.userName,
          avatar_url: user.avatarUrl,
          access_token: user.accessToken,
        },
      ], { returning: "minimal" });
    if (error) {
      throw new Error(error.message);
    }
  }

  async getUserByAccessTokenOrThrow(
    accessToken: string,
  ): Promise<DatabaseUser> {
    const user = await this.getUserByAccessToken(accessToken);
    if (user == null) {
      throw new Error("Could not find user with access token.");
    }
    return user;
  }

  async getUserByAccessToken(
    accessToken: string,
  ): Promise<DatabaseUser | undefined> {
    const { data, error } = await this.#client
      .from("users")
      .select("id,username,avatar_url")
      .eq("access_token", accessToken);
    if (error) {
      throw a new Error(error.message);
    }
    if (data.length === 0) {
      return undefined;
    }
    return {
      userId: data[0].id,
      userName: data[0].username,
      avatarUrl: data[0].avatar_url,
    };
  }

  async getRooms() {
    const { data, error } = await this.#client.from("rooms_with_activity")
      .select(
        "id,name,last_message_at",
      );
    if (error) {
      throw new Error(error.message);
    }
    return data.map((d) => ({
      roomId: d.id,
      name: d.name,
      lastMessageAt: d.last_message_at,
    }));
  }

  async getRoomName(roomId: number): Promise<string> {
    const { data, error } = await this.#client.from("rooms")
      .select("name")
      .eq("id", roomId);
    if (error) {
      throw new
