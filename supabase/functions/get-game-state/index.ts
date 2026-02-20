import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { room_id, session_id } = await req.json();

    if (!room_id || !session_id) {
      return new Response(JSON.stringify({ error: "Missing room_id or session_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the player is in this room
    const { data: player } = await supabase
      .from("room_players")
      .select("player_index")
      .eq("room_id", room_id)
      .eq("session_id", session_id)
      .single();

    if (!player || player.player_index === null) {
      return new Response(JSON.stringify({ error: "Not a participant" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: room } = await supabase
      .from("rooms")
      .select("game_state")
      .eq("id", room_id)
      .single();

    if (!room?.game_state) {
      return new Response(JSON.stringify(null), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gs = room.game_state as any;
    const myIndex = player.player_index;

    // Filter: hide opponents' hand and faceDown cards
    gs.players = gs.players.map((p: any, i: number) => {
      if (i === myIndex) return p; // Own data — full access
      return {
        ...p,
        hand: p.hand.map((_: any, j: number) => ({ id: `hidden_h_${i}_${j}`, value: "?", suit: "?" })),
        faceDown: p.faceDown.map((_: any, j: number) => ({ id: `hidden_fd_${i}_${j}`, value: "?", suit: "?" })),
        // faceUp stays visible (they're on the table)
      };
    });

    return new Response(JSON.stringify(gs), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
