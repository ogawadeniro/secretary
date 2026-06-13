import { useState, useEffect, useMemo } from "react";
import { fetchAcceptedUsernames } from "../api/sharemanApi";
import { fetchGroupMembers } from "../api/groupApi";
import { searchUsers } from "../api/userApi";

export interface MemberCandidate {
  username: string;
  displayName: string;
  chipBgColor?: string;
}

interface UseMemberCandidatesParams {
  groupId?: number;
  excludeUsername?: string;
  memberInput: string;
  isMember: (username: string) => boolean;
  existingDisplayNames?: Record<string, string>;
  existingChipBgColors?: Record<string, string>;
  currentUsername?: string;
}

interface UseMemberCandidatesResult {
  candidates: MemberCandidate[];
  displayNameMap: Record<string, string>;
  chipBgColorMap: Record<string, string | undefined>;
  filteredSuggestions: MemberCandidate[];
}

/**
 * メンバー入力の補完候補を管理するフック。
 * グループ選択時はグループメンバー、未選択時はシェアメン＋全ユーザーを候補として取得し、
 * 入力値でフィルタリングした結果と表示名・チップ色のマップを返す。
 */
export function useMemberCandidates({
  groupId,
  excludeUsername,
  memberInput,
  isMember,
  existingDisplayNames,
  existingChipBgColors,
  currentUsername,
}: UseMemberCandidatesParams): UseMemberCandidatesResult {
  const [candidates, setCandidates] = useState<MemberCandidate[]>([]);

  // グループ選択に応じて候補を取得
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (groupId) {
          const groupMembers = await fetchGroupMembers(groupId);
          if (cancelled) return;
          const list = groupMembers
            .filter((m) => m.username !== excludeUsername)
            .sort((a, b) => a.username.localeCompare(b.username))
            .map((m) => ({
              username: m.username,
              displayName: m.displayName ?? m.username,
              chipBgColor: m.chipBgColor,
            }));
          setCandidates(list);
        } else {
          const [accepted, allUsers] = await Promise.all([
            fetchAcceptedUsernames(),
            searchUsers(""),
          ]);
          if (cancelled) return;
          const list = accepted
            .filter((u) => u !== excludeUsername)
            .sort()
            .map((username) => ({
              username,
              displayName: allUsers.find((u) => u.username === username)?.displayName ?? username,
              chipBgColor: allUsers.find((u) => u.username === username)?.chipBgColor,
            }));
          setCandidates(list);
        }
      } catch {
        // 候補一覧がなくても機能に影響なし
      }
    })();
    return () => { cancelled = true; };
  }, [groupId, excludeUsername]);

  // 入力値でフィルタリングした補完候補
  const filteredSuggestions = useMemo(() => {
    const query = memberInput.trim().toLowerCase();
    if (query === "") {
      return candidates.filter((c) => !isMember(c.username));
    }
    return candidates.filter((c) =>
      !isMember(c.username) && (
        c.username.toLowerCase().includes(query) ||
        c.displayName.toLowerCase().includes(query)
      )
    );
  }, [candidates, memberInput, isMember]);

  // 表示名マップ
  const displayNameMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (existingDisplayNames) {
      Object.assign(map, existingDisplayNames);
    }
    if (currentUsername && !(currentUsername in map)) {
      map[currentUsername] = currentUsername;
    }
    candidates.forEach((c) => {
      if (!(c.username in map)) {
        map[c.username] = c.displayName;
      }
    });
    return map;
  }, [candidates, existingDisplayNames, currentUsername]);

  // チップ背景色マップ
  const chipBgColorMap = useMemo<Record<string, string | undefined>>(() => {
    const map: Record<string, string | undefined> = {};
    if (existingChipBgColors) {
      Object.assign(map, existingChipBgColors);
    }
    candidates.forEach((c) => {
      if (!(c.username in map)) {
        map[c.username] = c.chipBgColor;
      }
    });
    return map;
  }, [candidates, existingChipBgColors]);

  return { candidates, displayNameMap, chipBgColorMap, filteredSuggestions };
}
