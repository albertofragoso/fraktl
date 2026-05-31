import { ScanItem } from '../utils/groupScansByDate'

const today = new Date().toISOString()
const yesterday = new Date(Date.now() - 86400000).toISOString()

export const DEV_SCANS: ScanItem[] = [
  {
    id: 'dev-1',
    species: 'Quercus robur',
    symmetry_index: 0.87,
    fibonacci_alignment: 'Alta',
    narrative:
      'El roble despliega su arquitectura fractal con una coherencia que desafía la aleatoriedad. Cada ramificación obedece a una gramática silenciosa, inscrita en siglos de adaptación. Su corteza es un archivo: rugosidades que registran sequías, cicatrices que datan tormentas. Escucharlo es leer un texto sin principio ni final.',
    image_url: '',
    audio_url: '',
    scanned_at: today,
    location: 'Parque Hundido, CDMX',
  },
  {
    id: 'dev-2',
    species: 'Ficus benjamina',
    symmetry_index: 0.72,
    fibonacci_alignment: 'Media',
    narrative:
      'La higuera benjamina construye laberintos aéreos, raíces que descienden como columnas de un templo que nadie diseñó. Su sistema vascular opera bajo presiones que ningún ingeniero ha logrado replicar. Habita los márgenes: jardines, oficinas, aeropuertos. Siempre en el límite entre lo salvaje y lo doméstico.',
    image_url: '',
    audio_url: '',
    scanned_at: today,
  },
  {
    id: 'dev-3',
    species: 'Pinus sylvestris',
    symmetry_index: 0.94,
    fibonacci_alignment: 'Muy alta',
    narrative:
      'El pino silvestre es una antena. Sus acículas orientadas al sol maximizan la captación fotónica con una precisión que bordea lo ritual. La espiral de sus piñas codifica φ con una fidelidad que ningún instrumento mejora. Es el árbol que mejor recuerda haber sido bosque.',
    image_url: '',
    audio_url: '',
    scanned_at: yesterday,
    location: 'Desierto de los Leones',
  },
  {
    id: 'dev-4',
    species: 'Jacaranda mimosifolia',
    symmetry_index: 0.65,
    fibonacci_alignment: 'Baja',
    narrative:
      'La jacaranda florea con una violencia suave. Su morado es una señal: el fin del invierno, el inicio del estrés. Florece antes de tener hojas, invirtiendo el orden lógico. Es un árbol que comunica con urgencia, que habla primero y piensa después.',
    image_url: '',
    audio_url: '',
    scanned_at: yesterday,
    location: 'Av. Insurgentes Sur',
  },
]
