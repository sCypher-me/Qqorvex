-- Índices de cobertura para FKs que participam de joins, deletes em cascata e
-- consultas relacionais. São aditivos e não alteram a semântica das policies.
create index if not exists assets_warranty_id_fk_idx
  on public.assets (warranty_id);
create index if not exists base_pages_page_id_fk_idx
  on public.base_pages (page_id);
create index if not exists budgets_category_id_fk_idx
  on public.budgets (category_id);
create index if not exists card_statements_user_id_fk_idx
  on public.card_statements (user_id);
create index if not exists errors_doubts_flashcard_id_fk_idx
  on public.errors_doubts (flashcard_id);
create index if not exists errors_doubts_summary_id_fk_idx
  on public.errors_doubts (summary_id);
create index if not exists errors_doubts_topic_id_fk_idx
  on public.errors_doubts (topic_id);
create index if not exists flashcards_summary_id_fk_idx
  on public.flashcards (summary_id);
create index if not exists goal_habit_relations_habit_id_fk_idx
  on public.goal_habit_relations (habit_id);
create index if not exists goals_progress_source_account_id_fk_idx
  on public.goals (progress_source_account_id);
create index if not exists google_oauth_states_user_id_fk_idx
  on public.google_oauth_states (user_id);
create index if not exists installments_account_id_fk_idx
  on public.installments (account_id);
create index if not exists installments_card_id_fk_idx
  on public.installments (card_id);
create index if not exists installments_category_id_fk_idx
  on public.installments (category_id);
create index if not exists library_collection_items_item_id_fk_idx
  on public.library_collection_items (item_id);
create index if not exists library_item_relations_target_item_id_fk_idx
  on public.library_item_relations (target_item_id);
create index if not exists notebook_library_items_library_item_id_fk_idx
  on public.notebook_library_items (library_item_id);
create index if not exists plan_goals_goal_id_fk_idx
  on public.plan_goals (goal_id);
create index if not exists project_tasks_task_id_fk_idx
  on public.project_tasks (task_id);
create index if not exists recurring_transactions_account_id_fk_idx
  on public.recurring_transactions (account_id);
create index if not exists recurring_transactions_card_id_fk_idx
  on public.recurring_transactions (card_id);
create index if not exists recurring_transactions_category_id_fk_idx
  on public.recurring_transactions (category_id);
create index if not exists redemption_codes_created_by_fk_idx
  on public.redemption_codes (created_by);
create index if not exists redemption_codes_redeemed_by_fk_idx
  on public.redemption_codes (redeemed_by);
create index if not exists routine_habits_habit_id_fk_idx
  on public.routine_habits (habit_id);
create index if not exists task_dependencies_depends_on_task_id_fk_idx
  on public.task_dependencies (depends_on_task_id);
create index if not exists transactions_account_id_fk_idx
  on public.transactions (account_id);
create index if not exists transactions_card_id_fk_idx
  on public.transactions (card_id);
create index if not exists transactions_category_id_fk_idx
  on public.transactions (category_id);
create index if not exists transactions_document_id_fk_idx
  on public.transactions (document_id);
create index if not exists transactions_transfer_to_account_id_fk_idx
  on public.transactions (transfer_to_account_id);
create index if not exists transactions_vehicle_id_fk_idx
  on public.transactions (vehicle_id);
create index if not exists vex_conversations_user_id_fk_idx
  on public.vex_conversations (user_id);
create index if not exists vex_messages_conversation_id_fk_idx
  on public.vex_messages (conversation_id);
create index if not exists warranties_document_id_fk_idx
  on public.warranties (document_id);
