import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const cafeProfile = sqliteTable("cafe_profile", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  concept: text("concept").notNull().default(""),
  introduction: text("introduction").notNull().default(""),
  menus: text("menus").notNull().default("[]"),
  tone: text("tone").notNull().default("warm"),
  customerType: text("customer_type").notNull().default(""),
  logoPath: text("logo_path"),
  photoPaths: text("photo_paths").notNull().default("[]"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const generations = sqliteTable("generations", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  input: text("input").notNull(),
  options: text("options").notNull(),
  selectedIndex: integer("selected_index"),
  copied: integer("copied").notNull().default(0),
  downloaded: integer("downloaded").notNull().default(0),
  isSample: integer("is_sample").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

export const uploads = sqliteTable("uploads", {
  id: text("id").primaryKey(),
  storedName: text("stored_name").notNull(),
  originalName: text("original_name").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  createdAt: integer("created_at").notNull(),
});
