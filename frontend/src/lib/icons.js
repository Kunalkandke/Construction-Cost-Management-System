import { Home, Rows3, Building2, Landmark } from 'lucide-react';

const MAP = { Home, Rows3, Building2, Landmark };
export const iconFor = (name) => MAP[name] || Home;
