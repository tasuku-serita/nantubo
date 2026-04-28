import { useApp } from '../context/AppContext';

export function useHistory() {
  const { history, addHistory, removeHistory } = useApp();
  return { history, addHistory, removeHistory };
}
