create extension if not exists vector;

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  notification_email text,
  created_at timestamptz not null default now()
);

insert into companies (name, slug)
values ('Default', 'default')
on conflict (slug) do nothing;

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (id, company_id)
);

create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  document_name text not null,
  chunk_index integer not null,
  content text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now(),
  foreign key (document_id, company_id)
    references documents(id, company_id)
    on delete cascade
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  email text not null,
  question text not null,
  created_at timestamptz not null default now()
);

create index if not exists document_chunks_document_id_idx
  on document_chunks(document_id);

create index if not exists document_chunks_company_id_idx
  on document_chunks(company_id);

create index if not exists documents_company_id_idx
  on documents(company_id);

create index if not exists leads_company_id_created_at_idx
  on leads(company_id, created_at desc);

create index if not exists documents_created_at_idx
  on documents(created_at desc);

create or replace function match_document_chunks(
  query_embedding vector(1536),
  query_company_id uuid,
  match_count int default 3
)
returns table (
  id uuid,
  document_id uuid,
  document_name text,
  chunk_index integer,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.document_name,
    document_chunks.chunk_index,
    document_chunks.content,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where document_chunks.company_id = query_company_id
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
$$;
