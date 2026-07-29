import {describe,expect,it} from "vitest";
import AdmZip from "adm-zip";
import {unpackScorm} from "../lib/scorm";

describe("SCORM importer",()=>{
  it("finds the launch file declared by imsmanifest.xml",async()=>{const zip=new AdmZip();zip.addFile("imsmanifest.xml",Buffer.from('<manifest><resources><resource href="course/index.html"/></resources></manifest>'));zip.addFile("course/index.html",Buffer.from("<h1>Simulación</h1>"));const result=await unpackScorm("practice.zip",zip.toBuffer().buffer as ArrayBuffer);expect(result.launch).toBe("course/index.html");expect(result.files).toHaveLength(2)});
  it("rejects packages without a manifest",async()=>{const zip=new AdmZip();zip.addFile("index.html",Buffer.from("test"));await expect(unpackScorm("bad.zip",zip.toBuffer().buffer as ArrayBuffer)).rejects.toThrow("imsmanifest.xml")});
});
