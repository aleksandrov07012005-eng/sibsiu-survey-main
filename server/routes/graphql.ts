import { Router } from "express";
import { buildSchema } from "graphql";
import { graphqlHTTP } from "express-graphql";
import { surveysRepository } from "../repositories/surveysRepository";

const schema = buildSchema(`
  type SurveyCard {
    id: Int!
    dateRange: String!
    description: String!
    target: String!
    isActive: Boolean!
  }

  type PaginatedSurveyCards {
    items: [SurveyCard!]!
    total: Int!
    page: Int!
    limit: Int!
    totalPages: Int!
  }

  type Query {
    activeSurveys(page: Int, limit: Int): PaginatedSurveyCards!
  }
`);

const root = {
  activeSurveys: async ({ page, limit }: { page?: number; limit?: number }) => {
    return surveysRepository.getActiveSurveysForHome(page ?? 1, limit ?? 10);
  },
};

const router = Router();

router.use(
  "/",
  graphqlHTTP({
    schema,
    rootValue: root,
    graphiql: process.env.NODE_ENV !== "production",
  }),
);

export default router;
