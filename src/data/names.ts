// Fictional names. Any likeness to real people is coincidence.

export const NATIONS: { code: string; name: string; first: string[]; last: string[] }[] = [
  { code: 'GB', name: 'Britain', first: ['Oliver', 'Harry', 'Jack', 'Callum', 'Ethan', 'Rhys', 'Toby', 'Finn'], last: ['Ashworth', 'Pembrook', 'Hale', 'Whitlock', 'Carver', 'Thorne', 'Kingsley', 'Blackwood'] },
  { code: 'IT', name: 'Italy', first: ['Matteo', 'Luca', 'Davide', 'Enzo', 'Marco', 'Paolo', 'Nico', 'Stefano'], last: ['Ferri', 'Caruso', 'Bellini', 'Marchetti', 'Vitale', 'Rinaldi', 'Gallo', 'Santoro'] },
  { code: 'FR', name: 'France', first: ['Théo', 'Hugo', 'Louis', 'Antoine', 'Mathis', 'Jules', 'Rémi', 'Bastien'], last: ['Laurent', 'Moreau', 'Girard', 'Fontaine', 'Rousseau', 'Delacroix', 'Marchand', 'Leroy'] },
  { code: 'DE', name: 'Germany', first: ['Lukas', 'Felix', 'Jonas', 'Maximilian', 'Leon', 'Tobias', 'Niklas', 'Paul'], last: ['Krämer', 'Vogt', 'Brandt', 'Hoffmann', 'Lindner', 'Schuster', 'Engel', 'Falk'] },
  { code: 'ES', name: 'Spain', first: ['Pablo', 'Diego', 'Álvaro', 'Javier', 'Sergio', 'Iker', 'Raúl', 'Marc'], last: ['Navarro', 'Ortega', 'Serrano', 'Molina', 'Castillo', 'Vidal', 'Romero', 'Iglesias'] },
  { code: 'NL', name: 'Netherlands', first: ['Daan', 'Sem', 'Bram', 'Thijs', 'Jesse', 'Ruben'], last: ['de Wit', 'Bakker', 'Visser', 'van Dijk', 'Mulder', 'Smit'] },
  { code: 'BR', name: 'Brazil', first: ['Rafael', 'Gabriel', 'Thiago', 'Bruno', 'Caio', 'Felipe'], last: ['Almeida', 'Barbosa', 'Moura', 'Teixeira', 'Pires', 'Cardoso'] },
  { code: 'JP', name: 'Japan', first: ['Haruto', 'Ren', 'Sota', 'Kaito', 'Yuto', 'Riku'], last: ['Takeda', 'Morimoto', 'Ishikawa', 'Kondo', 'Fujiwara', 'Sakai'] },
  { code: 'AU', name: 'Australia', first: ['Lachlan', 'Cooper', 'Mitchell', 'Liam', 'Jaxon', 'Brodie'], last: ['McKenzie', 'Hartley', 'Doyle', 'Fraser', 'Gallagher', 'Rowe'] },
  { code: 'US', name: 'USA', first: ['Tyler', 'Mason', 'Austin', 'Logan', 'Carter', 'Wyatt'], last: ['Brooks', 'Coleman', 'Sawyer', 'Reed', 'Hayes', 'Dalton'] },
  { code: 'MX', name: 'Mexico', first: ['Mateo', 'Santiago', 'Emiliano', 'Rodrigo', 'Andrés'], last: ['Reyes', 'Guerrero', 'Mendoza', 'Salazar', 'Ávila'] },
  { code: 'FI', name: 'Finland', first: ['Aleksi', 'Eetu', 'Joonas', 'Onni', 'Veeti'], last: ['Lahtinen', 'Koskela', 'Heikkilä', 'Salo', 'Nurmi'] },
  { code: 'PH', name: 'Philippines', first: ['Miguel', 'Carlo', 'Paolo', 'Rafa', 'Gio'], last: ['Santos', 'Dela Cruz', 'Villanueva', 'Bautista', 'Mercado'] },
  { code: 'CA', name: 'Canada', first: ['Owen', 'Nathan', 'Dylan', 'Connor', 'Blake'], last: ['Tremblay', 'Gagnon', 'MacLeod', 'Bouchard', 'Fraser'] },
];

export const STAFF_FIRST = ['Alex', 'Sam', 'Jordan', 'Chris', 'Robin', 'Kim', 'Dana', 'Morgan', 'Pat', 'Jamie', 'Andrea', 'Toni', 'Elena', 'Marta', 'Ingrid', 'Yuki', 'Priya', 'Sofia', 'Gemma', 'Carla'];
export const STAFF_LAST = ['Okafor', 'Lindqvist', 'Moretti', 'Hughes', 'Nakamura', 'Schmidt', 'Duarte', 'Novak', 'Patel', 'Byrne', 'Kowalski', 'Andersen', 'Rossi', 'Webb', 'Costa', 'Ivanova', 'Petit', 'Haas', 'Quinn', 'Silva'];

/** 30 fictional teams, ordered roughly from established big team to small outfit. */
export const TEAM_NAMES: { name: string; short: string; primary: string; secondary: string }[] = [
  { name: 'Vantage Racing', short: 'VAN', primary: '#c8102e', secondary: '#ffffff' },
  { name: 'Kestrel Motorsport', short: 'KES', primary: '#00a19c', secondary: '#0b1f2a' },
  { name: 'Aurora GP', short: 'AUR', primary: '#ff8000', secondary: '#1a1a1a' },
  { name: 'Silverline Works', short: 'SIL', primary: '#c0c6cf', secondary: '#0e0e10' },
  { name: 'Nightfall Racing', short: 'NGT', primary: '#3a2bd6', secondary: '#f5c400' },
  { name: 'Corsa Bianca', short: 'COR', primary: '#f2f2f2', secondary: '#c8102e' },
  { name: 'Helix Engineering', short: 'HLX', primary: '#2ecc71', secondary: '#101820' },
  { name: 'Thunderbolt RT', short: 'THU', primary: '#ffd400', secondary: '#202020' },
  { name: 'Meridian Motorsport', short: 'MER', primary: '#1e90ff', secondary: '#ffffff' },
  { name: 'Obsidian Racing', short: 'OBS', primary: '#5a5a66', secondary: '#e10600' },
  { name: 'Falcon Speed', short: 'FAL', primary: '#8b0000', secondary: '#f0e6d2' },
  { name: 'Polaris Racing', short: 'POL', primary: '#6fd3ff', secondary: '#0a2540' },
  { name: 'Ironclad Motorsport', short: 'IRN', primary: '#7d8c99', secondary: '#ff6b00' },
  { name: 'Sakura Racing', short: 'SAK', primary: '#ff6fa8', secondary: '#ffffff' },
  { name: 'Velocity Lab', short: 'VEL', primary: '#a0ff1f', secondary: '#111111' },
  { name: 'Granite Racing', short: 'GRA', primary: '#9e9e9e', secondary: '#1565c0' },
  { name: 'Crimson Arrow', short: 'CRI', primary: '#dc143c', secondary: '#111111' },
  { name: 'Bluewater GP', short: 'BLU', primary: '#0057b8', secondary: '#ffd700' },
  { name: 'Emberline Racing', short: 'EMB', primary: '#ff4500', secondary: '#2b2b2b' },
  { name: 'Northstar Motorsport', short: 'NOR', primary: '#00264d', secondary: '#c0c0c0' },
  { name: 'Viper Corse', short: 'VIP', primary: '#00c853', secondary: '#000000' },
  { name: 'Apex Junior Team', short: 'APX', primary: '#ffb300', secondary: '#3e2723' },
  { name: 'Lynx Racing', short: 'LYN', primary: '#8e44ad', secondary: '#ffffff' },
  { name: 'Torque Brothers', short: 'TOR', primary: '#b71c1c', secondary: '#ffeb3b' },
  { name: 'Riviera Racing', short: 'RIV', primary: '#26c6da', secondary: '#004d40' },
  { name: 'Summit Motorsport', short: 'SUM', primary: '#4caf50', secondary: '#fafafa' },
  { name: 'Copperhead GP', short: 'COP', primary: '#b87333', secondary: '#1b1b1b' },
  { name: 'Pulse Racing', short: 'PUL', primary: '#e91e63', secondary: '#212121' },
  { name: 'Stormfront RT', short: 'STO', primary: '#607d8b', secondary: '#ffc107' },
  { name: 'Rookie Forge', short: 'ROO', primary: '#ff7043', secondary: '#263238' },
];
