export interface CommunityPost {
  id: string;
  nickname: string;
  avatarInitial: string;
  content: string;
  imageData?: string;
  location?: { lat: number; lng: number; name: string };
  timestamp: number;
  likes: number;
  liked: boolean;
}

export interface Friend {
  id: string;
  nickname: string;
  avatarInitial: string;
  avatarColor: string;
  status: string;
}

export interface ChatMessage {
  id: string;
  friendId: string;
  content: string;
  timestamp: number;
  isMe: boolean;
}

const POSTS_KEY = "community_posts";
const FRIENDS_KEY = "community_friends";
const MESSAGES_KEY = "community_messages";

const SEED_POSTS: CommunityPost[] = [
  {
    id: "seed1",
    nickname: "珠海小栗子",
    avatarInitial: "栗",
    content: "情侣路的黄昏真的太美了 🌅 推荐傍晚六点来，光线超棒！",
    location: { lat: 22.2577, lng: 113.5497, name: "情侣路" },
    timestamp: Date.now() - 1000 * 60 * 30,
    likes: 24,
    liked: false,
  },
  {
    id: "seed2",
    nickname: "旅行中的云朵",
    avatarInitial: "云",
    content: "圆明新园的建筑复原得好精细，穿汉服拍照绝了！强烈推荐",
    location: { lat: 22.1406, lng: 113.5538, name: "圆明新园" },
    timestamp: Date.now() - 1000 * 60 * 90,
    likes: 57,
    liked: false,
  },
  {
    id: "seed3",
    nickname: "美食侦探",
    avatarInitial: "食",
    content: "外伶仃岛的海鲜太鲜了！刚从海里捞上来的螃蟹，鲜甜到哭😭",
    location: { lat: 21.9993, lng: 113.8223, name: "外伶仃岛" },
    timestamp: Date.now() - 1000 * 60 * 180,
    likes: 89,
    liked: false,
  },
];

const SEED_FRIENDS: Friend[] = [
  { id: "f1", nickname: "珠海小栗子", avatarInitial: "栗", avatarColor: "#fde68a", status: "刚刚在情侣路打卡" },
  { id: "f2", nickname: "旅行中的云朵", avatarInitial: "云", avatarColor: "#bfdbfe", status: "在圆明新园" },
];

export function getPosts(): CommunityPost[] {
  try {
    const stored = JSON.parse(localStorage.getItem(POSTS_KEY) || "null");
    if (!stored) {
      localStorage.setItem(POSTS_KEY, JSON.stringify(SEED_POSTS));
      return SEED_POSTS;
    }
    return stored;
  } catch {
    return SEED_POSTS;
  }
}

export function addPost(data: Omit<CommunityPost, "id" | "likes" | "liked">): CommunityPost {
  const post: CommunityPost = { ...data, id: Date.now().toString(), likes: 0, liked: false };
  const posts = getPosts();
  const updated = [post, ...posts].slice(0, 100);
  localStorage.setItem(POSTS_KEY, JSON.stringify(updated));
  return post;
}

export function toggleLike(id: string): void {
  const posts = getPosts();
  const updated = posts.map((p) =>
    p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p
  );
  localStorage.setItem(POSTS_KEY, JSON.stringify(updated));
}

export function getFriends(): Friend[] {
  try {
    const stored = JSON.parse(localStorage.getItem(FRIENDS_KEY) || "null");
    if (!stored) {
      localStorage.setItem(FRIENDS_KEY, JSON.stringify(SEED_FRIENDS));
      return SEED_FRIENDS;
    }
    return stored;
  } catch {
    return SEED_FRIENDS;
  }
}

export function addFriend(friend: Omit<Friend, "id">): Friend {
  const f: Friend = { ...friend, id: Date.now().toString() };
  const list = getFriends();
  const updated = [...list, f];
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(updated));
  return f;
}

export function getMessages(friendId: string): ChatMessage[] {
  try {
    const all = JSON.parse(localStorage.getItem(MESSAGES_KEY) || "{}");
    return all[friendId] || [];
  } catch {
    return [];
  }
}

export function sendMessage(friendId: string, content: string): ChatMessage {
  const msg: ChatMessage = {
    id: Date.now().toString(),
    friendId,
    content,
    timestamp: Date.now(),
    isMe: true,
  };
  try {
    const all = JSON.parse(localStorage.getItem(MESSAGES_KEY) || "{}");
    all[friendId] = [...(all[friendId] || []), msg];
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(all));
  } catch {}
  return msg;
}

export function formatPostTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "刚刚";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return new Date(ts).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}
