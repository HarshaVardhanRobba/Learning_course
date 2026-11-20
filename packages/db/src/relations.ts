import { relations } from 'drizzle-orm'
import { applications, users } from './schema'

export const usersRelations = relations(users, ({ one }) => ({
  application: one(applications, { fields: [users.id], references: [applications.userId] }),
}))

export const applicationsRelations = relations(applications, ({ one }) => ({
  user: one(users, { fields: [applications.userId], references: [users.id] }),
}))
