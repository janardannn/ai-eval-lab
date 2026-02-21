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
          "Tell me a bit about yourself — your name, background, and what you're currently working on or studying.",
          "How did you first get into electronics or PCB design? Walk me through your journey.",
          "What are you hoping to demonstrate in this assessment today?",
        ],
        adaptive: false,
        maxQuestions: 3,
      },
      domainConfig: {
        questions: [
          "Can you explain what a current limiting resistor does in an LED circuit, and why it's necessary?",
          "Walk me through how you'd calculate the right resistor value for an LED given the supply voltage, LED forward voltage, and desired current.",
          "What would happen electrically if you connected an LED directly to a 5V source without a resistor?",
          "In KiCad, what's the difference between the F.Cu and B.Cu layers, and when would you route on each?",
          "After routing a PCB, how do you verify your design is correct before fabrication?",
        ],
        adaptive: true,
        maxQuestions: 5,
        adaptivePrompt:
          "You are a technical interviewer evaluating a candidate's understanding of basic PCB design and LED circuits. Ask follow-up questions that test practical understanding, not memorized definitions. If an answer is vague, probe for specifics. If an answer shows strong understanding, move to the next topic.",
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
          "Tell me a bit about yourself — your name, what you study or work on, and your experience level with electronics.",
          "Have you designed a PCB before? If so, describe the most complex board you've worked on.",
          "What aspects of PCB design do you find most challenging, and why?",
        ],
        adaptive: false,
        maxQuestions: 3,
      },
      domainConfig: {
        questions: [
          "What is a bypass capacitor, and why do you place them close to IC power pins rather than elsewhere on the board?",
          "If you have a 5V supply and an LED with a 2V forward voltage that needs 15mA, walk me through the resistor calculation.",
          "Explain the difference between a ground plane and individual ground traces. When would you use each approach?",
          "Why does component placement order matter in PCB design? What do you typically place first and why?",
          "What is DRC in KiCad, what types of errors does it catch, and at what stage of design should you run it?",
        ],
        adaptive: true,
        maxQuestions: 5,
        adaptivePrompt:
          "You are a technical interviewer evaluating a candidate's PCB design knowledge at an intermediate level. Test practical understanding of power distribution, component placement strategy, and design validation. Probe deeper when answers lack specifics. If the candidate demonstrates strong understanding, advance quickly.",
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
