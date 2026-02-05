<script setup lang="ts">
  import type { PermitCondition } from '~/components/permit/ConditionCard.vue'

  interface Props {
    page: number
    totalPages: number
    conditions?: PermitCondition[]
    activeConditionId?: string | null
  }

  const props = defineProps<Props>()
  const emit = defineEmits<{
    (e: 'condition-click', condition: PermitCondition): void
  }>()

  const conditionsOnPage = computed(() => {
    return props.conditions?.filter((c) => c.page === props.page) || []
  })

  function getConditionById(id: string) {
    return conditionsOnPage.value.find((c) => c.id === id)
  }

  function handleConditionClick(conditionId: string) {
    const condition = getConditionById(conditionId)
    if (condition) {
      emit('condition-click', condition)
    }
  }

  const equipmentData = [
    { id: 'Debur-1', description: 'Abrasive Deburring', controlDevice: 'CD-Mob-1', emissionPoint: 'QAL-Fug' },
    { id: 'Debur-2', description: 'Abrasive Deburring', controlDevice: 'CD-Mob-2', emissionPoint: 'QAL-Fug' },
  ]

  const controlDevices = [
    { id: 'CD-Mob-1', description: 'Mobiflex 400-MS Welding Fume Extraction Unit', pollutants: 'PM, PM₁₀, PM₂.₅' },
    { id: 'CD-Mob-2', description: 'Mobiflex 400-MS Welding Fume Extraction Unit', pollutants: 'PM, PM₁₀, PM₂.₅' },
  ]

  const reportingSchedule = [
    { frequency: 'Quarterly', period: 'January-March', dueDate: 'April 30' },
    { frequency: 'Quarterly', period: 'April-June', dueDate: 'July 30' },
    { frequency: 'Quarterly', period: 'July-September', dueDate: 'October 30' },
    { frequency: 'Quarterly', period: 'October-December', dueDate: 'January 30' },
    { frequency: 'Semiannual', period: 'January-June', dueDate: 'July 30' },
    { frequency: 'Semiannual', period: 'July-December', dueDate: 'January 30' },
    { frequency: 'Annual', period: 'January-December', dueDate: 'January 30' },
  ]

  const emissionRates = [
    { id: 'DG_CTR', nox1hr: '0.90', noxAnnual: '0.75', co: '13.50', lead: '--' },
    { id: 'EG01', nox1hr: '--', noxAnnual: '0.0425', co: '0.82', lead: '--' },
    { id: 'EG02', nox1hr: '--', noxAnnual: '0.1115', co: '2.14', lead: '--' },
    { id: 'GENIE', nox1hr: '0.1000', noxAnnual: '0.1000', co: '0.08', lead: '5.00E-07' },
    { id: 'LINE1 (RMMV1)', nox1hr: '0.1910', noxAnnual: '0.1910', co: '0.16', lead: '9.55E-07' },
    { id: 'MB1', nox1hr: '59.0396', noxAnnual: '42.5714', co: '422.55', lead: '2.84E-01' },
    { id: 'MB2', nox1hr: '14.7619', noxAnnual: '10.6428', co: '140.85', lead: '5.02E-02' },
  ]
</script>

<template>
  <div class="space-y-4 text-xs leading-relaxed">
    <!-- Page 3: Project Description & Equipment -->
    <template v-if="page === 3">
      <section>
        <h2 class="mb-2 text-sm font-bold">PROJECT DESCRIPTION</h2>
        <p class="text-muted-foreground">
          Permission is hereby granted to construct a Quench and Temper (Q&T) process and two Quality Assurance Lines
          (QALs).
        </p>
        <p class="mt-2 text-muted-foreground">
          For the Q&T Line, Nucor will add to the cold finish side of the Darlington Mill a structure that would heat
          the metal to below its melting point with electric induction furnaces (no emissions expected), quench with
          recirculating water, then saw, straighten, debur, cut or chamfer the product. The process would be supported
          by a cooling tower. All equipment associated with this process (Cooling Bed, Cooling Tower, Multi-head Saw)
          are exempt and will be added to Insignificant Activities list of Title V.
        </p>
        <p class="mt-2 text-muted-foreground">
          The QALs are primarily used for testing and surface defect detection. The emission unit associated with the
          two QALs will include straighteners, deburring operations, and multi-head saws. Only the deburring operations
          associated with this project will not be exempt and/or Insignificant Activities.
        </p>
      </section>

      <section class="mt-4">
        <h3 class="mb-2 font-bold">EQUIPMENT</h3>
        <table class="w-full border-collapse border border-gray-300">
          <thead class="bg-gray-100">
            <tr>
              <th class="border border-gray-300 px-2 py-1 text-left">Equipment ID</th>
              <th class="border border-gray-300 px-2 py-1 text-left">Equipment Description</th>
              <th class="border border-gray-300 px-2 py-1 text-left">Control Device ID</th>
              <th class="border border-gray-300 px-2 py-1 text-left">Emission Point ID</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="eq in equipmentData" :key="eq.id">
              <td class="border border-gray-300 px-2 py-1">{{ eq.id }}</td>
              <td class="border border-gray-300 px-2 py-1">{{ eq.description }}</td>
              <td class="border border-gray-300 px-2 py-1">{{ eq.controlDevice }}</td>
              <td class="border border-gray-300 px-2 py-1">{{ eq.emissionPoint }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="mt-4">
        <h3 class="mb-2 font-bold">CONTROL DEVICES</h3>
        <table class="w-full border-collapse border border-gray-300">
          <thead class="bg-gray-100">
            <tr>
              <th class="border border-gray-300 px-2 py-1 text-left">Control Device ID</th>
              <th class="border border-gray-300 px-2 py-1 text-left">Control Device Description</th>
              <th class="border border-gray-300 px-2 py-1 text-left">Pollutant(s) Controlled</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cd in controlDevices" :key="cd.id">
              <td class="border border-gray-300 px-2 py-1">{{ cd.id }}</td>
              <td class="border border-gray-300 px-2 py-1">{{ cd.description }}</td>
              <td class="border border-gray-300 px-2 py-1">{{ cd.pollutants }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="mt-4">
        <h3 class="mb-2 font-bold">LIMITATIONS, MONITORING, AND REPORTING</h3>
        <table class="w-full border-collapse border border-gray-300">
          <thead class="bg-gray-100">
            <tr>
              <th class="w-20 border border-gray-300 px-2 py-1 text-left">Condition Number</th>
              <th class="border border-gray-300 px-2 py-1 text-left">Conditions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              class="cursor-pointer transition-colors"
              :class="
                activeConditionId === 'cond-1'
                  ? 'bg-violet-100 ring-2 ring-inset ring-violet-400'
                  : 'bg-violet-50/50 hover:bg-violet-50'
              "
              @click="handleConditionClick('cond-1')">
              <td class="border border-gray-300 px-2 py-1 align-top font-medium" rowspan="2">
                <div class="flex items-center gap-1">
                  <span
                    class="flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    :class="activeConditionId === 'cond-1' ? 'bg-violet-500' : 'bg-violet-400'">
                    1
                  </span>
                </div>
              </td>
              <td class="border border-gray-300 px-2 py-1 bg-gray-50 text-[10px]">
                <strong>Equipment ID:</strong>
                Debur-1, Debur-2
                <br />
                <strong>Control Device ID:</strong>
                CD-Mob-1, CD-Mob-2
              </td>
            </tr>
            <tr
              class="cursor-pointer transition-colors"
              :class="activeConditionId === 'cond-1' ? 'bg-violet-100' : 'bg-violet-50/50 hover:bg-violet-50'"
              @click="handleConditionClick('cond-1')">
              <td class="border border-gray-300 px-2 py-1">
                The owner or operator shall continue to operate under all applicable requirements, including emission
                limits and standards, testing, monitoring, record keeping, and reporting of the existing Title V
                Operating Permit (TV-0820-0001) that are not changed or contravened by this construction permit.
              </td>
            </tr>
            <tr
              class="cursor-pointer transition-colors"
              :class="
                activeConditionId === 'cond-2'
                  ? 'bg-violet-100 ring-2 ring-inset ring-violet-400'
                  : 'bg-violet-50/50 hover:bg-violet-50'
              "
              @click="handleConditionClick('cond-2')">
              <td class="border border-gray-300 px-2 py-1 align-top font-medium">
                <div class="flex items-center gap-1">
                  <span
                    class="flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    :class="activeConditionId === 'cond-2' ? 'bg-violet-500' : 'bg-violet-400'">
                    2
                  </span>
                </div>
              </td>
              <td class="border border-gray-300 px-2 py-1">
                This permit supersedes construction permit 0820-0001-DL issued December 21, 2020. All applicable
                requirements from construction permit 0820-0001-DL have been included in this construction permit.
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>

    <!-- Page 4: Conditions 3-5 -->
    <template v-else-if="page === 4">
      <section>
        <h3 class="mb-2 font-bold">LIMITATIONS, MONITORING, AND REPORTING</h3>
        <table class="w-full border-collapse border border-gray-300">
          <thead class="bg-gray-100">
            <tr>
              <th class="w-20 border border-gray-300 px-2 py-1 text-left">Condition Number</th>
              <th class="border border-gray-300 px-2 py-1 text-left">Conditions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              class="cursor-pointer transition-colors"
              :class="
                activeConditionId === 'cond-3'
                  ? 'bg-violet-100 ring-2 ring-inset ring-violet-400'
                  : 'bg-violet-50/50 hover:bg-violet-50'
              "
              @click="handleConditionClick('cond-3')">
              <td class="border border-gray-300 px-2 py-1 align-top font-medium" rowspan="2">
                <div class="flex items-center gap-1">
                  <span
                    class="flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    :class="activeConditionId === 'cond-3' ? 'bg-violet-500' : 'bg-violet-400'">
                    3
                  </span>
                </div>
              </td>
              <td class="border border-gray-300 px-2 py-1 bg-gray-50 text-[10px]">
                <strong>Equipment ID:</strong>
                Debur-1, Debur-2
                <br />
                <strong>Control Device ID:</strong>
                CD-Mob-1, CD-Mob-2
              </td>
            </tr>
            <tr
              class="cursor-pointer transition-colors"
              :class="activeConditionId === 'cond-3' ? 'bg-violet-100' : 'bg-violet-50/50 hover:bg-violet-50'"
              @click="handleConditionClick('cond-3')">
              <td class="border border-gray-300 px-2 py-1">
                <p>
                  (S.C. Regulation 61-62.5, Standard No. 4, Section IX) Where construction or modification began after
                  December 31, 1985, emissions from this/these source(s) (including fugitive emissions) shall not
                  exhibit an opacity greater than 20%, each.
                </p>
              </td>
            </tr>
            <tr
              class="cursor-pointer transition-colors"
              :class="
                activeConditionId === 'cond-4'
                  ? 'bg-violet-100 ring-2 ring-inset ring-violet-400'
                  : 'bg-violet-50/50 hover:bg-violet-50'
              "
              @click="handleConditionClick('cond-4')">
              <td class="border border-gray-300 px-2 py-1 align-top font-medium" rowspan="2">
                <div class="flex items-center gap-1">
                  <span
                    class="flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    :class="activeConditionId === 'cond-4' ? 'bg-violet-500' : 'bg-violet-400'">
                    4
                  </span>
                </div>
              </td>
              <td class="border border-gray-300 px-2 py-1 bg-gray-50 text-[10px]">
                <strong>Equipment ID:</strong>
                Debur-1, Debur-2
                <br />
                <strong>Control Device ID:</strong>
                CD-Mob-1, CD-Mob-2
              </td>
            </tr>
            <tr
              class="cursor-pointer transition-colors"
              :class="activeConditionId === 'cond-4' ? 'bg-violet-100' : 'bg-violet-50/50 hover:bg-violet-50'"
              @click="handleConditionClick('cond-4')">
              <td class="border border-gray-300 px-2 py-1">
                <p>
                  (S.C. Regulation 61-62.5, Standard No. 4, Section VIII) Particulate matter emissions shall be limited
                  to the rate specified by use of the following equations:
                </p>
                <p class="ml-4 mt-1">For process weight rates less than or equal to 30 tons per hour</p>
                <p class="ml-8">
                  E = (F) 4.10P
                  <sup>0.67</sup>
                </p>
                <p class="ml-4 mt-1">For process weight rates greater than 30 tons per hour</p>
                <p class="ml-8">
                  E = (F) (55.0P
                  <sup>0.11</sup>
                  - 40)
                </p>
                <p class="mt-2">Where E = the allowable emission rate in pounds per hour</p>
                <p class="ml-4">P = process weight rate in tons per hour</p>
                <p class="ml-4">F = effect factor from Table B in S.C. Regulation 61-62.5, Standard No. 4</p>
                <p class="mt-2">
                  For the purposes of compliance with this condition, the process boundaries are defined as follows:
                </p>
                <ul class="ml-4 list-disc">
                  <li>Debur-1 - Max Process Weight Rate 8.0 ton/hr</li>
                  <li>Debur-2 - Max Process Weight Rate 8.0 ton/hr</li>
                </ul>
              </td>
            </tr>
            <tr
              class="cursor-pointer transition-colors"
              :class="
                activeConditionId === 'cond-5'
                  ? 'bg-violet-100 ring-2 ring-inset ring-violet-400'
                  : 'bg-violet-50/50 hover:bg-violet-50'
              "
              @click="handleConditionClick('cond-5')">
              <td class="border border-gray-300 px-2 py-1 align-top font-medium" rowspan="2">
                <div class="flex items-center gap-1">
                  <span
                    class="flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    :class="activeConditionId === 'cond-5' ? 'bg-violet-500' : 'bg-violet-400'">
                    5
                  </span>
                </div>
              </td>
              <td class="border border-gray-300 px-2 py-1 bg-gray-50 text-[10px]">
                <strong>Equipment ID:</strong>
                Debur-1, Debur-2
                <br />
                <strong>Control Device ID:</strong>
                CD-Mob-1, CD-Mob-2
              </td>
            </tr>
            <tr
              class="cursor-pointer transition-colors"
              :class="activeConditionId === 'cond-5' ? 'bg-violet-100' : 'bg-violet-50/50 hover:bg-violet-50'"
              @click="handleConditionClick('cond-5')">
              <td class="border border-gray-300 px-2 py-1">
                <p>
                  Filter(s) shall be operational and in place at all times when equipment or processes controlled by
                  filter(s) are operating, except during periods of malfunction or mechanical failure. Filter change
                  indicator shall be checked each time the unit is used, and the filter shall be replaced as needed.
                </p>
                <p class="mt-2">
                  Operation and maintenance checks shall be made as guided by the manufacturer for the welding fume
                  extraction units for proper operation. The checks and any corrective actions shall be documented and
                  kept on-site.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="mt-4">
        <h3 class="mb-2 font-bold">GENERAL FACILITY WIDE</h3>
        <table class="w-full border-collapse border border-gray-300">
          <thead class="bg-gray-100">
            <tr>
              <th class="w-20 border border-gray-300 px-2 py-1 text-left">Condition Number</th>
              <th class="border border-gray-300 px-2 py-1 text-left">Conditions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="border border-gray-300 px-2 py-1 align-top font-medium">1</td>
              <td class="border border-gray-300 px-2 py-1">
                The permittee shall pay permit fees to the Department in accordance with the requirements of S.C.
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>

    <!-- Page 5: General Facility Wide continued -->
    <template v-else-if="page === 5">
      <section>
        <h3 class="mb-2 font-bold">GENERAL FACILITY WIDE</h3>
        <table class="w-full border-collapse border border-gray-300">
          <thead class="bg-gray-100">
            <tr>
              <th class="w-20 border border-gray-300 px-2 py-1 text-left">Condition Number</th>
              <th class="border border-gray-300 px-2 py-1 text-left">Conditions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              class="cursor-pointer transition-colors"
              :class="
                activeConditionId === 'cond-6'
                  ? 'bg-violet-100 ring-2 ring-inset ring-violet-400'
                  : 'bg-violet-50/50 hover:bg-violet-50'
              "
              @click="handleConditionClick('cond-6')">
              <td class="border border-gray-300 px-2 py-1 align-top font-medium">
                <div class="flex items-center gap-1">
                  <span
                    class="flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    :class="activeConditionId === 'cond-6' ? 'bg-violet-500' : 'bg-violet-400'">
                    1
                  </span>
                </div>
              </td>
              <td class="border border-gray-300 px-2 py-1">
                <p>Regulation 61-30, Environmental Protection Fees.</p>
                <p class="mt-1">
                  In the event of an emergency, as defined in S.C. Regulation 61-62.1, Section III(L), the owner or
                  operator may document an emergency situation through properly signed, contemporaneous operating logs,
                  and other relevant evidence that verify:
                </p>
                <ol class="ml-4 mt-1 list-decimal">
                  <li>An emergency occurred, and the owner or operator can identify the cause(s) of the emergency;</li>
                  <li>The permitted source was at the time the emergency occurred being properly operated;</li>
                  <li>
                    During the period of the emergency, the owner or operator took all reasonable steps to minimize
                    levels of emissions that exceeded the emission standards, or other requirements in the permit; and
                  </li>
                  <li>
                    The owner or operator gave a verbal notification of the emergency to the Department within 24 hours
                    of the time when emission limitations were exceeded, followed by a written report within 30 days.
                  </li>
                </ol>
              </td>
            </tr>
            <tr
              class="cursor-pointer transition-colors"
              :class="
                activeConditionId === 'cond-7'
                  ? 'bg-violet-100 ring-2 ring-inset ring-violet-400'
                  : 'bg-violet-50/50 hover:bg-violet-50'
              "
              @click="handleConditionClick('cond-7')">
              <td class="border border-gray-300 px-2 py-1 align-top font-medium">
                <div class="flex items-center gap-1">
                  <span
                    class="flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    :class="activeConditionId === 'cond-7' ? 'bg-violet-500' : 'bg-violet-400'">
                    2
                  </span>
                </div>
              </td>
              <td class="border border-gray-300 px-2 py-1">
                <p>
                  (S.C. Regulation 61-62.1, Section II(O)) Upon presentation of credentials and other documents as may
                  be required by law, the owner or operator shall allow the Department or an authorized representative
                  to perform the following:
                </p>
                <ol class="ml-4 mt-1 list-decimal">
                  <li>
                    Enter the facility where emissions-related activity is conducted, or where records must be kept
                    under the conditions of the permit.
                  </li>
                  <li>
                    Have access to and copy, at reasonable times, any records that must be kept under the conditions of
                    the permit.
                  </li>
                  <li>
                    Inspect any facilities, equipment (including monitoring and air pollution control equipment),
                    practices, or operations regulated or required under this permit.
                  </li>
                  <li>
                    As authorized by the Federal Clean Air Act and/or the S.C. Pollution Control Act, sample or monitor
                    at reasonable times substances or parameters for the purpose of assuring compliance with the permit
                    or applicable requirements.
                  </li>
                </ol>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>

    <!-- Page 6: Emissions Inventory Reports -->
    <template v-else-if="page === 6">
      <section>
        <h3 class="mb-2 font-bold">EMISSIONS INVENTORY REPORTS</h3>
        <table class="w-full border-collapse border border-gray-300">
          <thead class="bg-gray-100">
            <tr>
              <th class="w-20 border border-gray-300 px-2 py-1 text-left">Condition Number</th>
              <th class="border border-gray-300 px-2 py-1 text-left">Conditions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              class="cursor-pointer transition-colors"
              :class="
                activeConditionId === 'cond-8'
                  ? 'bg-violet-100 ring-2 ring-inset ring-violet-400'
                  : 'bg-violet-50/50 hover:bg-violet-50'
              "
              @click="handleConditionClick('cond-8')">
              <td class="border border-gray-300 px-2 py-1 align-top font-medium">
                <div class="flex items-center gap-1">
                  <span
                    class="flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    :class="activeConditionId === 'cond-8' ? 'bg-violet-500' : 'bg-violet-400'">
                    1
                  </span>
                </div>
              </td>
              <td class="border border-gray-300 px-2 py-1">
                <p>
                  All newly permitted and constructed Title V sources and/or Non-attainment Area Sources shall complete
                  and submit an emissions inventory consistent with the schedule approved pursuant to S.C. Regulation
                  61-62.1, Section III. These Emissions Inventory Reports shall be submitted to the Manager of the
                  Emissions Inventory Section, Bureau of Air Quality.
                </p>
                <p class="mt-2">
                  This requirement notwithstanding, an emissions inventory may be required at any time in order to
                  determine the compliance status of any facility.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="mt-4">
        <h3 class="mb-2 font-bold">GENERAL RECORD KEEPING AND REPORTING</h3>
        <table class="w-full border-collapse border border-gray-300">
          <thead class="bg-gray-100">
            <tr>
              <th class="w-20 border border-gray-300 px-2 py-1 text-left">Condition Number</th>
              <th class="border border-gray-300 px-2 py-1 text-left">Conditions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              class="cursor-pointer transition-colors"
              :class="
                activeConditionId === 'cond-9'
                  ? 'bg-violet-100 ring-2 ring-inset ring-violet-400'
                  : 'bg-violet-50/50 hover:bg-violet-50'
              "
              @click="handleConditionClick('cond-9')">
              <td class="border border-gray-300 px-2 py-1 align-top font-medium">
                <div class="flex items-center gap-1">
                  <span
                    class="flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    :class="activeConditionId === 'cond-9' ? 'bg-violet-500' : 'bg-violet-400'">
                    1
                  </span>
                </div>
              </td>
              <td class="border border-gray-300 px-2 py-1">
                <p>
                  (S.C. Regulation 61-62.1, Section II(j)(1)(g)) A copy of the Department issued construction and/or
                  operating permit must be kept readily available at the facility at all times. The owner or operator
                  shall maintain such operational records; make reports; install, use, and maintain monitoring equipment
                  or methods; sample and analyze emissions or discharges in accordance with prescribed methods at
                  locations, intervals, and procedures as the Department shall prescribe.
                </p>
              </td>
            </tr>
            <tr>
              <td class="border border-gray-300 px-2 py-1 align-top font-medium">2</td>
              <td class="border border-gray-300 px-2 py-1">
                <p>
                  Reporting required in this permit, shall be submitted in a timely manner as directed in the Periodic
                  Reporting Schedule of this permit.
                </p>
              </td>
            </tr>
            <tr>
              <td class="border border-gray-300 px-2 py-1 align-top font-medium">3</td>
              <td class="border border-gray-300 px-2 py-1">
                <p>
                  All reports and notifications required under this permit shall be submitted to the person indicated in
                  the specific condition at the following address:
                </p>
                <p class="mt-1 text-center font-medium">
                  2600 Bull Street
                  <br />
                  Columbia, SC 29201
                </p>
                <p class="mt-1">
                  The contact information for the local Environmental Affairs Regional office can be found at:
                  <span class="text-blue-600">http://www.scdhec.gov</span>
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>

    <!-- Page 7: Reporting Schedules -->
    <template v-else-if="page === 7">
      <section>
        <h3 class="mb-2 font-bold">GENERAL RECORD KEEPING AND REPORTING</h3>
        <table class="w-full border-collapse border border-gray-300">
          <thead class="bg-gray-100">
            <tr>
              <th class="w-20 border border-gray-300 px-2 py-1 text-left">Condition Number</th>
              <th class="border border-gray-300 px-2 py-1 text-left">Conditions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="border border-gray-300 px-2 py-1 align-top font-medium"></td>
              <td class="border border-gray-300 px-2 py-1">
                <p>written report shall include, at a minimum, the following:</p>
                <ol class="ml-4 mt-1 list-decimal">
                  <li>The identity of the stack and/or emission point where the excess emissions occurred;</li>
                  <li>
                    The magnitude of excess emissions expressed in the units of the applicable emission limitation and
                    the operating data and calculations used in determining the excess emissions;
                  </li>
                  <li>The time and duration of excess emissions;</li>
                  <li>The identity of the equipment causing the excess emissions;</li>
                  <li>The nature and cause of such excess emissions;</li>
                  <li>
                    The steps taken to remedy the malfunction and the steps taken or planned to prevent the recurrence
                    of such malfunction;
                  </li>
                  <li>The steps taken to limit the excess emissions; and,</li>
                  <li>
                    Documentation that the air pollution control equipment, process equipment, or processes were at all
                    times maintained and operated, to the maximum extent practicable, in a manner consistent with good
                    practice for minimizing emissions.
                  </li>
                </ol>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="mt-4">
        <h3 class="mb-2 font-bold">REPORTING SCHEDULES</h3>
        <table class="w-full border-collapse border border-gray-300">
          <thead class="bg-gray-100">
            <tr>
              <th class="border border-gray-300 px-2 py-1 text-left">
                Compliance Monitoring Report Submittal Frequency
              </th>
              <th class="border border-gray-300 px-2 py-1 text-left">
                Reporting Period (Begins on the startup date of the source)
              </th>
              <th class="border border-gray-300 px-2 py-1 text-left">Report Due Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(schedule, idx) in reportingSchedule" :key="idx">
              <td class="border border-gray-300 px-2 py-1">{{ schedule.frequency }}</td>
              <td class="border border-gray-300 px-2 py-1">{{ schedule.period }}</td>
              <td class="border border-gray-300 px-2 py-1">{{ schedule.dueDate }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>

    <!-- Page 8: Permit Expiration -->
    <template v-else-if="page === 8">
      <section>
        <h3 class="mb-2 font-bold">REPORTING SCHEDULES</h3>
        <p class="text-muted-foreground">
          Note: This reporting schedule does not supersede any federal reporting requirements including but not limited
          to 40 CFR Part 60, 40 CFR Part 61, and 40 CFR Part 63. All federal reports must meet the reporting time frames
          specified in the federal standard unless the Department or EPA approves a change.
        </p>
      </section>

      <section class="mt-4">
        <h3 class="mb-2 font-bold">PERMIT EXPIRATION AND EXTENSION</h3>
        <table class="w-full border-collapse border border-gray-300">
          <thead class="bg-gray-100">
            <tr>
              <th class="w-20 border border-gray-300 px-2 py-1 text-left">Condition Number</th>
              <th class="border border-gray-300 px-2 py-1 text-left">Conditions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="border border-gray-300 px-2 py-1 align-top font-medium">1</td>
              <td class="border border-gray-300 px-2 py-1">
                <p>
                  (S.C. Regulation 61-62.1, Section II(A)(4) and (5) and S.C. Regulation 61-62.1, Section II(j)(1)(f))
                  Approval to construct shall become invalid if construction:
                </p>
                <ol class="ml-4 mt-1 list-[lower-alpha]">
                  <li>is not commenced within 18 months after receipt of such approval;</li>
                  <li>is discontinued for a period of 18 months or more; or</li>
                  <li>is not completed within a reasonable time as deemed by the Department.</li>
                </ol>
                <p class="mt-2">
                  The Department may extend the construction permit for an additional 18-month period upon a
                  satisfactory showing that an extension is justified. This request must be made prior to the permit
                  expiration.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="mt-4">
        <h3 class="mb-2 font-bold">PERMIT TO OPERATE</h3>
        <table class="w-full border-collapse border border-gray-300">
          <thead class="bg-gray-100">
            <tr>
              <th class="w-20 border border-gray-300 px-2 py-1 text-left">Condition Number</th>
              <th class="border border-gray-300 px-2 py-1 text-left">Conditions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="border border-gray-300 px-2 py-1 align-top font-medium">1</td>
              <td class="border border-gray-300 px-2 py-1">
                <p>
                  (S.C. Regulation 61-62.1 Section II(F)(3)) When a Department issued construction permit includes
                  engineering and/or construction specifications, the owner/operator or professional engineer in charge
                  of the project shall certify that, to the best of his/her knowledge and belief and as a result of
                  periodic observation during construction, the construction under application has been completed in
                  accordance with the specifications agreed upon in the construction permit issued by the Department.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>

    <!-- Page 9: Ambient Air Standards -->
    <template v-else-if="page === 9">
      <section>
        <h3 class="mb-2 font-bold">PERMIT TO OPERATE</h3>
        <table class="w-full border-collapse border border-gray-300">
          <thead class="bg-gray-100">
            <tr>
              <th class="w-20 border border-gray-300 px-2 py-1 text-left">Condition Number</th>
              <th class="border border-gray-300 px-2 py-1 text-left">Conditions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="border border-gray-300 px-2 py-1 align-top font-medium">2</td>
              <td class="border border-gray-300 px-2 py-1">
                <p>
                  (S.C. Regulation 61-62.1, Section II(F)(1)) The owner or operator shall submit written notification to
                  the Department of the actual date of initial startup of each new or altered source, postmarked within
                  fifteen (15) days after such date. Any source that is required to obtain an air quality construction
                  permit issued by the Department must obtain an operating permit when the new or altered source is
                  placed into operation and shall comply with the requirements of this section.
                </p>
              </td>
            </tr>
            <tr>
              <td class="border border-gray-300 px-2 py-1 align-top font-medium">3</td>
              <td class="border border-gray-300 px-2 py-1">
                <p>
                  (S.C. Regulation 61-62.1, Section II(F)(4)(a)) For sources covered by an effective Title V operating
                  permit, the modification request required by Regulation 61-62.70 shall serve as the request to operate
                  for the purposes of S.C. Regulation 61-62.1, Section II(F). The request should be made using the
                  appropriate Title V modification form.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="mt-4">
        <h3 class="mb-2 font-bold">AMBIENT AIR STANDARDS REQUIREMENTS</h3>
        <table class="w-full border-collapse border border-gray-300">
          <thead class="bg-gray-100">
            <tr>
              <th class="w-20 border border-gray-300 px-2 py-1 text-left">Condition Number</th>
              <th class="border border-gray-300 px-2 py-1 text-left">Conditions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="border border-gray-300 px-2 py-1 align-top font-medium">1</td>
              <td class="border border-gray-300 px-2 py-1">
                <p>
                  Air dispersion modeling (or other method) has demonstrated that this facility's operation will not
                  interfere with the attainment and maintenance of any state or federal ambient air standard. Any
                  changes in the parameters used in this demonstration may require a review by the facility to determine
                  continuing compliance with these standards.
                </p>
                <p class="mt-2">
                  The owner/operator shall maintain this facility at or below the emission rates as listed in Attachment
                  - Emission Rates for Ambient Air Standards, not to exceed the pollutant limitations of this permit.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>

    <!-- Page 10 (Attachment): Emission Rates -->
    <template v-else-if="page === 10">
      <div class="text-center">
        <h2 class="text-sm font-bold">ATTACHMENT - Emission Rates for Ambient Air Standards</h2>
        <p class="mt-1 text-muted-foreground">Nucor Corporation - Darlington Plant</p>
        <p class="text-muted-foreground">0820-0001-DM</p>
      </div>

      <section class="mt-4">
        <h3 class="mb-2 text-center font-bold">
          STANDARD NO. 2 - AMBIENT AIR QUALITY STANDARDS EMISSION RATES (LBS/HR)
        </h3>
        <table class="w-full border-collapse border border-gray-300 text-[10px]">
          <thead class="bg-gray-100">
            <tr>
              <th class="border border-gray-300 px-1 py-0.5 text-left">Emission Point ID</th>
              <th class="border border-gray-300 px-1 py-0.5 text-center">
                NO
                <sub>x</sub>
                1-hr
              </th>
              <th class="border border-gray-300 px-1 py-0.5 text-center">
                NO
                <sub>x</sub>
                Annual
              </th>
              <th class="border border-gray-300 px-1 py-0.5 text-center">CO</th>
              <th class="border border-gray-300 px-1 py-0.5 text-center">Lead</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rate in emissionRates" :key="rate.id">
              <td class="border border-gray-300 px-1 py-0.5">{{ rate.id }}</td>
              <td class="border border-gray-300 px-1 py-0.5 text-center">{{ rate.nox1hr }}</td>
              <td class="border border-gray-300 px-1 py-0.5 text-center">{{ rate.noxAnnual }}</td>
              <td class="border border-gray-300 px-1 py-0.5 text-center">{{ rate.co }}</td>
              <td class="border border-gray-300 px-1 py-0.5 text-center">{{ rate.lead }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="mt-4">
        <h3 class="mb-2 text-center font-bold">
          STANDARD NO. 2 - EXEMPTED AMBIENT AIR QUALITY STANDARDS EMISSION RATES (LB/HR)
        </h3>
        <table class="w-full border-collapse border border-gray-300 text-[10px]">
          <thead class="bg-gray-100">
            <tr>
              <th class="border border-gray-300 px-1 py-0.5 text-left">Emission Point ID</th>
              <th class="border border-gray-300 px-1 py-0.5 text-center">
                PM
                <sub>10</sub>
              </th>
              <th class="border border-gray-300 px-1 py-0.5 text-center">
                PM
                <sub>2.5</sub>
              </th>
              <th class="border border-gray-300 px-1 py-0.5 text-center">
                SO
                <sub>2</sub>
              </th>
              <th class="border border-gray-300 px-1 py-0.5 text-center">
                NO
                <sub>x</sub>
              </th>
              <th class="border border-gray-300 px-1 py-0.5 text-center">CO</th>
              <th class="border border-gray-300 px-1 py-0.5 text-center">Lead</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="border border-gray-300 px-1 py-0.5">Q&T-Fug</td>
              <td class="border border-gray-300 px-1 py-0.5 text-center">0.068</td>
              <td class="border border-gray-300 px-1 py-0.5 text-center">0.035</td>
              <td class="border border-gray-300 px-1 py-0.5 text-center">--</td>
              <td class="border border-gray-300 px-1 py-0.5 text-center">--</td>
              <td class="border border-gray-300 px-1 py-0.5 text-center">--</td>
              <td class="border border-gray-300 px-1 py-0.5 text-center">--</td>
            </tr>
            <tr>
              <td class="border border-gray-300 px-1 py-0.5">QAL-Fug</td>
              <td class="border border-gray-300 px-1 py-0.5 text-center">0.68</td>
              <td class="border border-gray-300 px-1 py-0.5 text-center">0.34</td>
              <td class="border border-gray-300 px-1 py-0.5 text-center">--</td>
              <td class="border border-gray-300 px-1 py-0.5 text-center">--</td>
              <td class="border border-gray-300 px-1 py-0.5 text-center">--</td>
              <td class="border border-gray-300 px-1 py-0.5 text-center">--</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>

    <!-- Default pages 1-2 (cover/TOC) -->
    <template v-else-if="page === 1">
      <div class="flex h-64 flex-col items-center justify-center text-center">
        <h1 class="text-xl font-bold">CONSTRUCTION PERMIT</h1>
        <p class="mt-4 text-lg">Nucor Corporation - Darlington Plant</p>
        <p class="mt-2 text-muted-foreground">Permit Number: 0820-0001-DM</p>
        <p class="mt-4 text-sm text-muted-foreground">South Carolina Department of Health and Environmental Control</p>
        <p class="text-sm text-muted-foreground">Bureau of Air Quality</p>
      </div>
    </template>

    <template v-else-if="page === 2">
      <section>
        <h2 class="mb-4 text-sm font-bold">TABLE OF CONTENTS</h2>
        <div class="space-y-1 text-muted-foreground">
          <p>Project Description .................................................. 3</p>
          <p>Equipment ............................................................. 3</p>
          <p>Control Devices ...................................................... 3</p>
          <p>Limitations, Monitoring, and Reporting .......................... 3</p>
          <p>General Facility Wide ............................................... 4</p>
          <p>Emissions Inventory Reports ...................................... 6</p>
          <p>General Record Keeping and Reporting .......................... 6</p>
          <p>Reporting Schedules ................................................ 7</p>
          <p>Permit Expiration and Extension ................................. 8</p>
          <p>Permit to Operate ................................................... 8</p>
          <p>Ambient Air Standards Requirements ............................ 9</p>
          <p>Attachment - Emission Rates ..................................... 10</p>
        </div>
      </section>
    </template>

    <template v-else>
      <div class="flex h-64 items-center justify-center text-muted-foreground">Page {{ page }} content placeholder</div>
    </template>
  </div>
</template>
