UPDATE "ContractTemplate"
SET "content" = replace("content", 'La firma manuscrita electrónica y las imágenes del documento de identidad se recopilan como evidencia de aceptación.', 'La firma manuscrita electrónica se recopila como evidencia de aceptación.')
WHERE "content" LIKE '%imágenes del documento de identidad%';

UPDATE "ContractAcceptance"
SET "contractSnapshot" = replace("contractSnapshot", 'La firma manuscrita electrónica y las imágenes del documento de identidad se recopilan como evidencia de aceptación.', 'La firma manuscrita electrónica se recopila como evidencia de aceptación.')
WHERE "signedAt" IS NULL AND "contractSnapshot" LIKE '%imágenes del documento de identidad%';
