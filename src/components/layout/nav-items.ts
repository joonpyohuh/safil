export type NavItem = {
  href: string;
  label: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "홈" },
  { href: "/history", label: "히스토리" },
  { href: "/settings", label: "설정" },
];
