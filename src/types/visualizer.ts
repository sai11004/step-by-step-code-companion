export type Language = 'javascript' | 'python' | 'java' | 'cpp' | 'c';
export type ViewMode = 'visualize' | 'explain' | 'output';

export interface ExecutionStep {
  step: number;
  lineNumber: number;
  lineCode: string;
  memory: {
    variables: Record<string, any>;
    arrays: Record<string, any[]>;
  };
  callStack: { name: string; params: Record<string, any> }[];
  loops: {
    label: string;
    iterations: { value: string; status: 'done' | 'active' | 'pending' }[];
  }[];
  changedVariables: string[];
  conditionResult: boolean | null;
  swapAnimation: [number, number] | null;
  compareIndices: [number, number] | null;
  doneIndices: number[];
  returnValue: any | null;
  output: string[];
  error?: string;
}

export interface EditorSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
}

export const DEFAULT_SETTINGS: EditorSettings = {
  fontSize: 14,
  tabSize: 4,
  wordWrap: true,
  minimap: true,
};

export const LANGUAGE_TEMPLATES: Record<Language, string> = {
  javascript: `// Bubble Sort in JavaScript
function bubbleSort(arr) {
  let n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        let temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }
  return arr;
}

let numbers = [5, 3, 8, 1, 2];
console.log(bubbleSort(numbers));`,
  python: `# Bubble Sort in Python
def bubble_sort(arr):
    n = len(arr)
    for i in range(n - 1):
        for j in range(n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr

numbers = [5, 3, 8, 1, 2]
print(bubble_sort(numbers))`,
  java: `// Bubble Sort in Java
public class Main {
    public static void bubbleSort(int[] arr) {
        int n = arr.length;
        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
            }
        }
    }

    public static void main(String[] args) {
        int[] numbers = {5, 3, 8, 1, 2};
        bubbleSort(numbers);
        for (int num : numbers) {
            System.out.print(num + " ");
        }
    }
}`,
  cpp: `// Bubble Sort in C++
#include <iostream>
using namespace std;

void bubbleSort(int arr[], int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}

int main() {
    int numbers[] = {5, 3, 8, 1, 2};
    int n = 5;
    bubbleSort(numbers, n);
    for (int i = 0; i < n; i++) {
        cout << numbers[i] << " ";
    }
    return 0;
}`,
  c: `// Bubble Sort in C
#include <stdio.h>

void bubbleSort(int arr[], int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}

int main() {
    int numbers[] = {5, 3, 8, 1, 2};
    int n = 5;
    bubbleSort(numbers, n);
    for (int i = 0; i < n; i++) {
        printf("%d ", numbers[i]);
    }
    printf("\\n");
    return 0;
}`,
};
