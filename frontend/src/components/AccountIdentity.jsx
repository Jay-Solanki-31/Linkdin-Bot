import { useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { getLinkedInPictureUrl } from "@/api/linkedin";

export default function AccountIdentity({ compact = false }) {
  const { auth, isAuthenticated } = useAuth();
  const account = isAuthenticated ? auth : null;
  const name = account?.displayName?.trim() || "LinkedIn account";
  const picture = account?.profilePicture;
  return <Identity key={`${account?.memberUrn}:${picture}`} memberUrn={account?.memberUrn} name={name} picture={picture} compact={compact} />;
}

function Identity({ name, picture, memberUrn, compact }) {
  const [source, setSource] = useState("direct");
  let safe = false;
  try {
    const url = new URL(picture);
    safe = url.protocol === "https:" && !url.username && !url.password && !url.port
      && ["media.licdn.com", "media.licdn-ei.com"].includes(url.hostname);
  } catch {  }
  const initials = name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <span className="avatar small account-avatar overflow-hidden shrink-0">
        {safe && source !== "failed" ? <img key={source} src={source === "direct" ? picture : getLinkedInPictureUrl(memberUrn)} alt={`${name}'s LinkedIn profile picture`} width={34} height={34} referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={() => setSource(source === "direct" && memberUrn ? "session" : "failed")} /> : <span aria-label={`${name}'s initials`}>{initials}</span>}
      </span>
      <span className={compact ? "hidden sm:inline text-sm max-w-40 truncate" : "text-sm break-words"}>{name}</span>
    </span>
  );
}
