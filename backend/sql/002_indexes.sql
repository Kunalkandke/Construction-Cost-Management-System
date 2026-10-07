-- Indexes and constraints (Section 4.6)
create index if not exists idx_refresh_tokens_user on refresh_tokens(user_id);
create index if not exists idx_refresh_tokens_hash on refresh_tokens(token_hash);
create index if not exists idx_refresh_tokens_family on refresh_tokens(family_id);
create index if not exists idx_password_resets_hash on password_resets(token_hash);

create index if not exists idx_users_role on users(role);
create index if not exists idx_users_deleted on users(deleted_at);

create index if not exists idx_rate_items_category on rate_items(category);
create index if not exists idx_rate_items_set on rate_items(rate_set_id);
create index if not exists idx_rate_history_item_date on rate_history(item_code, effective_date);

-- Exactly one published rate set at any time
create unique index if not exists one_published_rate_set
  on rate_sets ((status)) where status = 'published';

create index if not exists idx_estimates_user_created on estimates(user_id, created_at desc);
create index if not exists idx_estimates_share_token on estimates(share_token);
create index if not exists idx_estimates_location on estimates(location_id);
create index if not exists idx_estimates_deleted on estimates(deleted_at);
create index if not exists idx_estimate_items_estimate on estimate_items(estimate_id);
create index if not exists idx_ai_insights_estimate_created on ai_insights(estimate_id, created_at desc);
create index if not exists idx_ai_insights_created on ai_insights(created_at desc);
create index if not exists idx_audit_logs_created on audit_logs(created_at desc);
create index if not exists idx_audit_logs_actor on audit_logs(actor_id);
create index if not exists idx_project_actuals_estimate on project_actuals(estimate_id);
create index if not exists idx_contact_messages_status on contact_messages(status, created_at desc);

-- Only one active prompt per key
create unique index if not exists one_active_prompt_per_key
  on ai_prompts(key) where is_active;

-- updated_at triggers on every table that has the column
do $$
declare t text;
begin
  foreach t in array array[
    'users','house_types','floor_options','bhk_configs','quality_tiers','structure_types',
    'locations','consumption_norms','material_coefficients','system_settings','rate_sets',
    'rate_items','estimates','ai_prompts','project_actuals','faqs','announcements','contact_messages'
  ] loop
    execute format('drop trigger if exists trg_%1$s_updated on %1$I', t);
    execute format(
      'create trigger trg_%1$s_updated before update on %1$I for each row execute function set_updated_at()', t);
  end loop;
end $$;
