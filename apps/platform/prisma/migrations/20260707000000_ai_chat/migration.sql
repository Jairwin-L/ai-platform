CREATE TYPE "AiProviderKind" AS ENUM ('OPENAI_COMPATIBLE', 'ANTHROPIC', 'GEMINI');
CREATE TYPE "ChatRole" AS ENUM ('SYSTEM', 'USER', 'ASSISTANT', 'TOOL');
CREATE TYPE "ChatMessageStatus" AS ENUM ('STREAMING', 'COMPLETED', 'STOPPED', 'ERROR');

CREATE TABLE "ai_provider_configs" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "provider" "AiProviderKind" NOT NULL,
  "base_url" TEXT,
  "api_key_ciphertext" TEXT NOT NULL,
  "api_key_iv" TEXT NOT NULL,
  "api_key_tag" TEXT NOT NULL,
  "key_version" INTEGER NOT NULL DEFAULT 1,
  "key_last4" TEXT NOT NULL,
  "is_enabled" BOOLEAN NOT NULL DEFAULT true,
  "last_verified_at" TIMESTAMPTZ(6),
  "last_verify_error" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ai_provider_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_model_configs" (
  "id" TEXT NOT NULL,
  "provider_config_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "model_id" TEXT NOT NULL,
  "system_prompt" TEXT,
  "generation_defaults" JSONB,
  "max_output_tokens" INTEGER,
  "is_enabled" BOOLEAN NOT NULL DEFAULT true,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ai_model_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_conversations" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "model_config_id" TEXT,
  "system_prompt" TEXT,
  "model_snapshot" JSONB,
  "last_message_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_messages" (
  "id" TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "role" "ChatRole" NOT NULL,
  "content" TEXT NOT NULL,
  "status" "ChatMessageStatus" NOT NULL DEFAULT 'COMPLETED',
  "model_snapshot" JSONB,
  "usage" JSONB,
  "metadata" JSONB,
  "error_code" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_usage" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "conversation_id" TEXT,
  "message_id" TEXT,
  "model_config_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model_id" TEXT NOT NULL,
  "prompt_tokens" INTEGER,
  "completion_tokens" INTEGER,
  "total_tokens" INTEGER,
  "latency_ms" INTEGER,
  "status" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_provider_configs_user_id_name_key" ON "ai_provider_configs"("user_id", "name");
CREATE INDEX "ai_provider_configs_user_id_is_enabled_idx" ON "ai_provider_configs"("user_id", "is_enabled");
CREATE UNIQUE INDEX "ai_model_configs_provider_config_id_model_id_key" ON "ai_model_configs"("provider_config_id", "model_id");
CREATE INDEX "ai_model_configs_provider_config_id_is_enabled_idx" ON "ai_model_configs"("provider_config_id", "is_enabled");
CREATE INDEX "ai_model_configs_is_default_idx" ON "ai_model_configs"("is_default");
CREATE INDEX "chat_conversations_user_id_deleted_at_last_message_at_idx" ON "chat_conversations"("user_id", "deleted_at", "last_message_at");
CREATE UNIQUE INDEX "chat_messages_conversation_id_sequence_key" ON "chat_messages"("conversation_id", "sequence");
CREATE INDEX "chat_messages_conversation_id_created_at_idx" ON "chat_messages"("conversation_id", "created_at");
CREATE INDEX "chat_messages_conversation_id_status_idx" ON "chat_messages"("conversation_id", "status");
CREATE INDEX "ai_usage_user_id_created_at_idx" ON "ai_usage"("user_id", "created_at");
CREATE INDEX "ai_usage_conversation_id_idx" ON "ai_usage"("conversation_id");

ALTER TABLE "ai_provider_configs" ADD CONSTRAINT "ai_provider_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_model_configs" ADD CONSTRAINT "ai_model_configs_provider_config_id_fkey" FOREIGN KEY ("provider_config_id") REFERENCES "ai_provider_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
