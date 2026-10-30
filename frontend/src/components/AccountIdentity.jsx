import { useState } from "react";
import { useAuth } from "@/auth/AuthContext";

export default function AccountIdentity({ compact = false }) {
  const { auth, isAuthenticated } = useAuth();
  const account = isAuthenticated ? auth : null;
  const name = account?.displayName?.trim() || "LinkedIn account";
  const picture = account?.profilePicture;
  return <Identity key={`${account?.memberUrn}:${picture}`} name={name} picture={picture} compact={compact} />;
}

function Identity({ name, picture, compact }) {
  const [failed, setFailed] = useState(false);
  let safe = false;
  try {
    const url = new URL(picture);
    safe = url.protocol === "https:" && !url.username && !url.password;
  } catch { /* Show initials for missing or invalid URLs. */ }
  const initials = name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <span className="avatar small overflow-hidden shrink-0" aria-hidden="true">
        {safe && !failed ? <img src={picture} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={() => setFailed(true)} /> : initials}
      </span>
      <span className={compact ? "hidden sm:inline text-sm max-w-40 truncate" : "text-sm break-words"}>{name}</span>
    </span>
  );
}
