// @ts-check
import { initSchema } from '@aws-amplify/datastore';
import { schema } from './schema';



const { User, Challenges } = initSchema(schema);

export {
  User,
  Challenges
};