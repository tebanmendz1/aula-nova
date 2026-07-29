import { S3Client } from "@aws-sdk/client-s3";

export function storageClient() {
  const endpoint=process.env.S3_ENDPOINT,accessKeyId=process.env.S3_ACCESS_KEY,secretAccessKey=process.env.S3_SECRET_KEY;
  if(!endpoint||!accessKeyId||!secretAccessKey) throw new Error("Almacenamiento no configurado");
  return new S3Client({endpoint,region:process.env.S3_REGION||"us-east-1",forcePathStyle:true,credentials:{accessKeyId,secretAccessKey}});
}

export function storageBucket(){return process.env.S3_BUCKET||"aula-recursos"}
