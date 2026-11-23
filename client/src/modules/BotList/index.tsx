import { useBotListQuery } from '../../generated/graphql';
import BotList from './BotList';

const BotListContainer = () => {
  const { data, error, loading } = useBotListQuery();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error || !data) {
    return <div role="alert">Could not load bots.</div>;
  }

  return <BotList data={data} />;
};

export default BotListContainer;
