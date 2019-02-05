import { withFilter } from 'graphql-subscriptions';
import { BUS_TOPICS } from '../config/conf';
import {
  addStixRelation,
  stixRelationDelete,
  findAll,
  findByType,
  findById,
  search,
  reports,
  markingDefinitions,
  stixRelationEditContext,
  stixRelationCleanContext,
  stixRelationEditField
} from '../domain/stixRelation';
import { fetchEditContext, pubsub } from '../database/redis';
import withCancel from '../schema/subscriptionWrapper';

const stixRelationResolvers = {
  Query: {
    stixRelation: (_, { id }) => findById(id),
    stixRelations: (_, args) => {
      if (args.search && args.search.length > 0) {
        return search(args);
      }
      if (args.relationType && args.relationType.length > 0) {
        return findByType(args);
      }
      return findAll(args);
    }
  },
  StixRelation: {
    markingDefinitions: (stixRelation, args) =>
      markingDefinitions(stixRelation.id, args),
    reports: (stixRelation, args) => reports(stixRelation.id, args),
    editContext: stixRelation => fetchEditContext(stixRelation.id)
  },
  Mutation: {
    stixRelationEdit: (_, { id }, { user }) => ({
      delete: () => stixRelationDelete(id),
      fieldPatch: ({ input }) => stixRelationEditField(user, id, input),
      contextPatch: ({ input }) => stixRelationEditContext(user, id, input),
      contextClean: () => stixRelationCleanContext(user, id)
    }),
    stixRelationAdd: (_, { input }, { user }) => addStixRelation(user, input)
  },
  Subscription: {
    stixRelation: {
      resolve: payload => payload.instance,
      subscribe: (_, { id }, { user }) => {
        stixRelationEditContext(user, id);
        const filtering = withFilter(
          () => pubsub.asyncIterator(BUS_TOPICS.StixRelation.EDIT_TOPIC),
          payload => {
            if (!payload) return false; // When disconnect, an empty payload is dispatched.
            return payload.user.id !== user.id && payload.instance.id === id;
          }
        )(_, { id }, { user });
        return withCancel(filtering, () => {
          stixRelationCleanContext(user, id);
        });
      }
    }
  }
};

export default stixRelationResolvers;
