import fs from "fs";

export function writeJsonAtomic(filePath: string, data: unknown) {
  const content = JSON.stringify(data, null, 2);
  try {
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, content, "utf-8");
    fs.renameSync(tempPath, filePath);
  } catch (e: any) {
    if (e.code === "EBUSY" || e.code === "EPERM" || e.code === "EXDEV") {
      // Docker bind mount 上 renameSync 可能失败，回退到直接写入
      fs.writeFileSync(filePath, content, "utf-8");
      try { fs.unlinkSync(`${filePath}.tmp`); } catch {}
    } else {
      throw e;
    }
  }
}
