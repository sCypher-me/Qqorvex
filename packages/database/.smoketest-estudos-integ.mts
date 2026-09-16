import { createClient } from "@supabase/supabase-js";
import {
  createNotebook,
  createAssessment,
  createEventForAssessment,
  relateLibraryItem,
  unrelateLibraryItem,
  listRelatedLibraryItems,
} from "../../modules/conhecimento/estudos/src/index.ts";
import { createItem as createLibraryItem } from "../../modules/conhecimento/biblioteca/src/index.ts";
import { listEventsByAssessment } from "../../modules/organizacao/agenda/src/index.ts";

const url = "https://uowipikbumbaprckdvkg.supabase.co";
const anonKey = process.env.SUPABASE_ANON_KEY!;
const userId = "32f98b00-8a4e-4555-9092-6f857481cc22";
const email = "smoketest-estudos-integ@example.com";
const password = "Sm0keTest!123";

const client = createClient(url, anonKey);

async function main() {
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  const notebook = await createNotebook(client, { title: "Caderno de teste" });
  console.log("notebook created:", notebook.id);

  // Biblioteca <-> Estudos
  const libraryItem = await createLibraryItem(client, userId, { title: "Livro de teste", itemType: "book" });
  console.log("library item created:", libraryItem.id);

  await relateLibraryItem(client, notebook.id, libraryItem.id);
  let related = await listRelatedLibraryItems(client, notebook.id);
  console.log("related after relate:", related.map((r) => r.id));
  if (related.length !== 1 || related[0].id !== libraryItem.id) throw new Error("relate failed");

  await unrelateLibraryItem(client, notebook.id, libraryItem.id);
  related = await listRelatedLibraryItems(client, notebook.id);
  console.log("related after unrelate:", related.length);
  if (related.length !== 0) throw new Error("unrelate failed");

  const { data: itemStillExists } = await client.from("library_items").select("id").eq("id", libraryItem.id).single();
  if (!itemStillExists) throw new Error("library item should survive unrelate");
  console.log("library item survives unrelate: OK");

  // Agenda <-> Estudos
  const assessment = await createAssessment(client, notebook.id, { name: "Prova de teste", assessmentDate: "2026-10-15" });
  console.log("assessment created:", assessment.id, assessment.assessment_date);

  const event1 = await createEventForAssessment(client, userId, assessment);
  console.log("event1 created:", event1.id);
  const event2 = await createEventForAssessment(client, userId, assessment);
  console.log("event2 (should equal event1):", event2.id);
  if (event1.id !== event2.id) throw new Error("idempotency failed - duplicate event created");

  const eventsForAssessment = await listEventsByAssessment(client, assessment.id);
  if (eventsForAssessment.length !== 1) throw new Error("expected exactly 1 event for assessment");
  console.log("exactly one event for assessment: OK");

  // delete assessment, event should survive with assessment_id set null
  await client.from("assessments").delete().eq("id", assessment.id);
  const { data: eventAfterAssessmentDelete } = await client.from("events").select("id, assessment_id").eq("id", event1.id).single();
  if (!eventAfterAssessmentDelete) throw new Error("event should survive assessment deletion");
  console.log("event survives assessment delete, assessment_id now:", eventAfterAssessmentDelete.assessment_id);
  if (eventAfterAssessmentDelete.assessment_id !== null) throw new Error("assessment_id should be null after delete");

  // cleanup remaining rows
  await client.from("events").delete().eq("id", event1.id);
  await client.from("library_items").delete().eq("id", libraryItem.id);
  await client.from("notebooks").delete().eq("id", notebook.id);

  console.log("ALL CHECKS PASSED");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
