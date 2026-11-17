export type PracticeId = "family" | "civil" | "succession" | "labor";

export type PracticeDefinition = {
  id: PracticeId;
  category: string;
  title: string;
  description: string;
  guideDescription: string;
  checklist: readonly string[];
  starter: string;
};

export const PRACTICES = [
  {
    id: "family",
    category: "Familia y vínculos",
    title: "Ordenar una\nsituación familiar.",
    description: "Una separación, los cuidados o un acuerdo que necesita conversarse. Empezá por identificar qué te preocupa.",
    guideDescription: "Podés empezar por contar qué está pasando, quiénes están involucrados y qué te gustaría conversar sobre tu situación familiar.",
    checklist: [
      "Una breve descripción de la situación y de lo que necesitás consultar.",
      "Acuerdos o documentos que ya existan, si los tenés.",
      "Las preguntas que te gustaría resolver en la primera conversación.",
    ],
    starter: "Hola, Abril. Quisiera conversar sobre una situación familiar. Me gustaría consultar…",
  },
  {
    id: "civil",
    category: "Derecho civil",
    title: "Entender un contrato\nantes de firmar.",
    description: "Qué estás por acordar, qué obligaciones aparecen y cuáles son los puntos que querés consultar.",
    guideDescription: "Un resumen de lo ocurrido y la información que ya tenés pueden ayudarte a preparar una consulta sobre contratos, arrendamientos u obligaciones.",
    checklist: [
      "El contrato, borrador u otro documento relacionado, si está disponible.",
      "Las fechas y comunicaciones que consideres relevantes.",
      "Las dudas concretas que querés plantear.",
    ],
    starter: "Hola, Abril. Quisiera consultar sobre un contrato. Mi duda principal es…",
  },
  {
    id: "succession",
    category: "Sucesiones",
    title: "Saber por dónde empezar\ncon una herencia.",
    description: "Cuando hay documentos y preguntas pendientes, ordenar la información es un buen comienzo.",
    guideDescription: "Si tu consulta está vinculada con una herencia, podés ordenar la información disponible y las preguntas que querés conversar.",
    checklist: [
      "Una breve descripción de la situación y del motivo de tu consulta.",
      "Los documentos que ya tengas disponibles, si los hay.",
      "Tus principales preguntas sobre cómo seguir; no necesitás tener todas las respuestas.",
    ],
    starter: "Hola, Abril. Quisiera hacer una consulta sobre una herencia. Las preguntas que tengo son…",
  },
  {
    id: "labor",
    category: "Derecho laboral",
    title: "Conversar sobre tu\nsituación de trabajo.",
    description: "Un cambio, un acuerdo o un conflicto laboral. Prepará los hechos y las dudas que querés plantear.",
    guideDescription: "Una descripción ordenada de lo que ocurrió puede ayudarte a explicar una situación de trabajo con tus propias palabras.",
    checklist: [
      "Una cronología breve de los hechos que querés consultar.",
      "Los documentos o comunicaciones relacionados que ya tengas.",
      "Las preguntas que te gustaría resolver en una primera conversación.",
    ],
    starter: "Hola, Abril. Quisiera consultar sobre una situación de trabajo. Lo que me gustaría conversar es…",
  },
] as const satisfies readonly PracticeDefinition[];

export function getPractice(id: PracticeId): PracticeDefinition {
  const practice = PRACTICES.find((item) => item.id === id);
  if (!practice) throw new Error(`Unknown practice: ${id}`);
  return practice;
}
