import { Standing } from '../../types';
import { getSportsDbStandings } from '../sportsDb/sportsDbService';
export async function getStandings(): Promise<Standing[]> { return getSportsDbStandings(); }
