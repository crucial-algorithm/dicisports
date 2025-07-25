/*
  Warnings:

  - Added the required column `slug` to the `sports` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "sports" ADD COLUMN     "slug" JSONB;

UPDATE public.sports SET slug = '{"pt": "atletismo"}' WHERE id = 1;
UPDATE public.sports SET slug = '{"pt": "trail"}' WHERE id = 2;
UPDATE public.sports SET slug = '{"pt": "ciclismo-estrada"}' WHERE id = 3;
UPDATE public.sports SET slug = '{"pt": "btt"}' WHERE id = 4;
UPDATE public.sports SET slug = '{"pt": "e-bike"}' WHERE id = 5;
UPDATE public.sports SET slug = '{"pt": "gravel"}' WHERE id = 6;
UPDATE public.sports SET slug = '{"pt": "enduro"}' WHERE id = 7;
UPDATE public.sports SET slug = '{"pt": "triatlo"}' WHERE id = 8;