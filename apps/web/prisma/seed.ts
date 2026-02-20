import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.task.upsert({
    where: { id: "led-circuit-easy" },
    update: {},
    create: {
      id: "led-circuit-easy",
      title: "Simple LED Circuit",
      difficulty: "easy",
      description:
        "Design a simple LED circuit on a PCB. Place a resistor (R1, 330 ohm, 0805) and an LED (D1, 0805) on the front copper layer. Connect them with a track on F.Cu. The resistor limits current to the LED. This tests basic component placement and routing.",
      timeLimit: 1800, // 30 minutes
      rubric: {
        checkpoints: [
          {
            name: "component_placement",
            description: "Both R1 and D1 placed on the board",
            weight: 25,
            expectedOrder: 1,
          },
          {
            name: "correct_footprints",
            description: "Using 0805 footprints for both components",
            weight: 15,
            expectedOrder: 1,
          },
          {
            name: "routing",
            description: "Track connecting R1 pad to D1 pad on F.Cu",
            weight: 30,
            expectedOrder: 2,
          },
          {
            name: "net_assignment",
            description: "Components connected with proper net names",
            weight: 15,
            expectedOrder: 2,
          },
          {
            name: "layout_quality",
            description: "Components reasonably spaced and aligned",
            weight: 15,
            expectedOrder: 1,
          },
        ],
      },
    },
  });

  await prisma.task.upsert({
    where: { id: "mcu-bypass-medium" },
    update: {},
    create: {
      id: "mcu-bypass-medium",
      title: "MCU with Bypass Capacitors",
      difficulty: "medium",
      description:
        "Place an STM32 microcontroller (LQFP-48) on a PCB. Add 100nF bypass capacitors (0402) near each VDD pin. Route power (VDD) and ground (GND) traces. This tests understanding of decoupling and power integrity.",
      timeLimit: 2700, // 45 minutes
      rubric: {
        checkpoints: [
          {
            name: "mcu_placement",
            description: "STM32 placed centrally on the board",
            weight: 15,
            expectedOrder: 1,
          },
          {
            name: "bypass_cap_placement",
            description: "100nF caps placed within 2mm of VDD pins",
            weight: 25,
            expectedOrder: 2,
          },
          {
            name: "power_routing",
            description: "VDD and GND traces properly routed",
            weight: 25,
            expectedOrder: 3,
          },
          {
            name: "trace_width",
            description: "Power traces wider than signal traces",
            weight: 15,
            expectedOrder: 3,
          },
          {
            name: "process_order",
            description: "Placed MCU first, then caps, then routed",
            weight: 20,
            expectedOrder: 1,
          },
        ],
      },
    },
  });

  console.log("seeded tasks");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
