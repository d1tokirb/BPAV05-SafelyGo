// Campus identity comes from its official website, not a person's email provider.
export function websiteIdentity(value: string): { website: string; domain: string } | null {
  const input = value.trim();
  if (!input || /\s/.test(input)) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : "https://" + input);
    const domain = url.hostname.toLowerCase().replace(/^www\./, "");
    if (url.protocol !== "https:" || url.username || url.password ||
        !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain)) return null;
    return { website: url.toString(), domain };
  } catch { return null; }
}
