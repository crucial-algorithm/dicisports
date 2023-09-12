/*
  Warnings:

  - Added the required column `description` to the `difficulties` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "difficulties" ADD COLUMN     "description" JSONB;

-- Update values
UPDATE "difficulties" SET id = 1, name = '{"pt": "Iniciante"}', description = '{"pt": "Praticante que está a descobrir a modalidade, com condição física pouco desenvolvida e fraco conhecimento técnico. Motivado a praticar."}';
UPDATE "difficulties" SET id = 2, name = '{"pt": "Experiente"}', description = '{"pt": "Praticante com elevado conhecimento da modalidade, com boa ou excelente condição física e bons conhecimentos técnicos. Motivado a superar-se."}';
UPDATE "difficulties" SET id = 3, name = '{"pt": "Especialista"}', description = '{"pt": "Praticante, ou atleta com total domínio da modalidade, condição física excelente e treinada, domínio técnico absoluto. Motivado para vencer, ou bater recordes."}';

-- Set description to NOT NULL
ALTER TABLE "difficulties" ALTER COLUMN "description" SET NOT NULL;