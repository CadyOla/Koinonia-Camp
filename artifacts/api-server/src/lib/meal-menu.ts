// The camp menu. Keep the backend (src/routes/meal-selection.ts) and
// frontend (src/pages/my-registration.tsx) copies of this file identical —
// the backend validates submissions against these exact option strings, so
// a mismatch would cause valid-looking selections to be rejected.
export const MEAL_SLOTS = [
  {
    key: "mealFridayEvening",
    label: "Friday Evening",
    options: ["Kenkey and Fish", "Rice with Chicken (Vegetable Stew)"],
  },
  {
    key: "mealSaturdayAfternoon",
    label: "Saturday Afternoon",
    options: [
      "Beans Stew, Fried Plantain and Egg",
      "Waakye with Fish, Wele and Fried Plantain",
    ],
  },
  {
    key: "mealSaturdayEvening",
    label: "Saturday Evening",
    options: [
      "Jollof Rice with Grilled Chicken",
      "Rice with Palava Sauce, Fish and Wele",
    ],
  },
  {
    key: "mealSundayAfternoon",
    label: "Sunday Afternoon",
    options: ["Fufu with Light Soup", "Banku with Tilapia"],
  },
  {
    key: "mealSundayEvening",
    label: "Sunday Evening",
    options: ["Yam with Palava Sauce", "Plantain with Palava Sauce", "Fried Rice"],
  },
  {
    key: "mealMondayBrunch",
    label: "Monday Brunch",
    options: ["Jollof with Grilled Chicken"],
  },
] as const;

export type MealSlotKey = (typeof MEAL_SLOTS)[number]["key"];
