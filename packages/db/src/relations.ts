import { relations } from 'drizzle-orm'
import { applicationReviews, applications, users } from './schema'

export const usersRelations = relations(users, ({ one, many }) => ({
  application: one(applications, { fields: [users.id], references: [applications.userId] }),
  reviewsGiven: many(applicationReviews),
}))

export const applicationsRelations = relations(applications, ({ one }) => ({
  user: one(users, { fields: [applications.userId], references: [users.id] }),
  review: one(applicationReviews, { fields: [applications.id], references: [applicationReviews.applicationId] }),
}))

export const applicationReviewsRelations = relations(applicationReviews, ({ one }) => ({
  application: one(applications, { fields: [applicationReviews.applicationId], references: [applications.id] }),
  reviewer: one(users, { fields: [applicationReviews.reviewerId], references: [users.id] }),
}))
