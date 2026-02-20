import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.assessment.upsert({
    where: { id: "led-circuit-easy" },
    update: {},
    create: {
      id: "led-circuit-easy",
      title: "Simple LED Circuit",
      difficulty: "easy",
      environment: "kicad",
      description:
        "Design a simple LED circuit on a PCB. Place a resistor (R1, 330 ohm, 0805) and an LED (D1, 0805) on the front copper layer. Connect them with a track on F.Cu. The resistor limits current to the LED.",
      timeLimit: 1800,
      introConfig: {
        questions: [
          "Tell me about yourself and your background.",
          "What's your experience with PCB design or electronics?",
          "What motivated you to take this assessment?",
        ],
        adaptive: false,
        maxQuestions: 3,
      },
      domainConfig: {
        questions: [
          "What is the purpose of a current limiting resistor in an LED circuit?",
          "How do you choose the correct resistor value for an LED?",
          "What happens if you connect an LED without a resistor?",
          "What is the difference between F.Cu and B.Cu layers?",
          "How do you verify your routing is correct?",
        ],
        adaptive: true,
        maxQuestions: 5,
        adaptivePrompt:
          "You are evaluating a candidate's basic PCB design knowledge. Based on their answers, probe deeper on weak areas or advance. Focus on practical understanding.",
      },
      labConfig: {
        problemStatement:
          "Design a simple LED circuit on a PCB. Place a resistor (R1, 330 ohm, 0805) and an LED (D1, 0805). Connect them with a track on F.Cu. This tests basic component placement and routing.",
        expectedComponents: [
          { type: "R_0805", count: 1, required: true },
          { type: "LED_0805", count: 1, required: true },
        ],
        rubric: {
          checkpoints: [
            {
              name: "Component Selection",
              description: "Both R1 and D1 placed on the board",
              weight: 25,
              expectedOrder: 1,
            },
            {
              name: "Correct Footprints",
              description: "Using 0805 footprints for both components",
              weight: 15,
              expectedOrder: 1,
            },
            {
              name: "Routing",
              description: "Track connecting R1 pad to D1 pad on F.Cu",
              weight: 30,
              expectedOrder: 2,
            },
            {
              name: "Net Assignment",
              description: "Components connected with proper net names",
              weight: 15,
              expectedOrder: 2,
            },
            {
              name: "Layout Quality",
              description: "Components reasonably spaced and aligned",
              weight: 15,
              expectedOrder: 1,
            },
          ],
        },
      },
    },
  });

  await prisma.assessment.upsert({
    where: { id: "arduino-led-medium" },
    update: {},
    create: {
      id: "arduino-led-medium",
      title: "Arduino Nano LED Circuit",
      difficulty: "medium",
      environment: "kicad",
      description:
        "Design a PCB for an Arduino Nano driving 3 LEDs with current limiting resistors and proper power filtering. Route power with 0.5mm traces and signal with 0.25mm traces. Add a ground plane on the back copper layer.",
      timeLimit: 2700,
      introConfig: {
        questions: [
          "Tell me about yourself and your background.",
          "What's your experience with PCB design?",
          "What interests you about electronics?",
        ],
        adaptive: false,
        maxQuestions: 3,
      },
      domainConfig: {
        questions: [
          "What is the purpose of a bypass capacitor?",
          "How do you calculate the value of a current limiting resistor for an LED?",
          "What's the difference between a ground plane and a ground trace?",
          "Why does component placement order matter in PCB design?",
          "What is DRC and when should you run it?",
        ],
        adaptive: true,
        maxQuestions: 5,
        adaptivePrompt:
          "You are evaluating a candidate's PCB design knowledge. Based on their previous answers, either probe deeper on weak areas or advance to the next topic. Focus on practical understanding, not textbook definitions.",
      },
      labConfig: {
        problemStatement:
          "Design a PCB with an Arduino Nano, 3 LEDs (red, green, blue), current limiting resistors (330 ohm), a bulk capacitor (100uF), and bypass capacitors (100nF) near the Arduino. Route power with 0.5mm traces and signal with 0.25mm traces. Add a ground plane on the back copper layer. Run DRC before submitting.",
        expectedComponents: [
          { type: "Arduino_Nano", count: 1, required: true },
          { type: "LED_0805", count: 3, required: true },
          { type: "R_0805", count: 3, required: true },
          { type: "C_0805", count: 3, required: true },
        ],
        rubric: {
          checkpoints: [
            {
              name: "Component Selection",
              description: "All required components placed with correct footprints",
              weight: 15,
              expectedOrder: 1,
            },
            {
              name: "Power Filtering",
              description: "Bulk cap near power input, bypass caps within 5mm of Arduino",
              weight: 20,
              expectedOrder: 2,
            },
            {
              name: "LED Circuit Topology",
              description: "Resistor in series between Arduino GPIO and each LED, correct orientation",
              weight: 20,
              expectedOrder: 3,
            },
            {
              name: "Routing Quality",
              description: "Power traces wider than signal, no acute angles, minimal vias",
              weight: 20,
              expectedOrder: 4,
            },
            {
              name: "Ground Plane",
              description: "Continuous ground pour on back copper, properly connected",
              weight: 15,
              expectedOrder: 5,
            },
            {
              name: "DRC Discipline",
              description: "DRC run at least once, no unresolved errors in final state",
              weight: 10,
              expectedOrder: 6,
            },
          ],
        },
      },
    },
  });

  console.log("seeded assessments");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
