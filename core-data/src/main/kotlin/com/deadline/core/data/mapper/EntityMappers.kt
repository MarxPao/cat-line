package com.deadline.core.data.mapper

import com.deadline.core.data.db.CheckInEntity
import com.deadline.core.data.db.GoalStepEntity
import com.deadline.core.data.db.LedgerEntryEntity
import com.deadline.core.data.db.OccurrenceEntity
import com.deadline.core.data.db.RewardEventEntity
import com.deadline.core.data.db.WeeklyLogEntity
import com.deadline.core.domain.model.CheckIn
import com.deadline.core.domain.model.CheckInOrigin
import com.deadline.core.domain.model.CheckInRecord
import com.deadline.core.domain.model.CommitmentId
import com.deadline.core.domain.model.CommitmentType
import com.deadline.core.domain.model.CurrencyType
import com.deadline.core.domain.model.DelayTier
import com.deadline.core.domain.model.EffortLevel
import com.deadline.core.domain.model.GoalId
import com.deadline.core.domain.model.GoalStep
import com.deadline.core.domain.model.GoalStepId
import com.deadline.core.domain.model.LedgerEntry
import com.deadline.core.domain.model.LedgerEntryId
import com.deadline.core.domain.model.Occurrence
import com.deadline.core.domain.model.OccurrenceId
import com.deadline.core.domain.model.OccurrenceState
import com.deadline.core.domain.model.RewardEvent
import com.deadline.core.domain.model.RewardEventId
import com.deadline.core.domain.model.RoutineCategory
import com.deadline.core.domain.model.WeeklyLog
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

fun OccurrenceEntity.toDomain(): Occurrence = Occurrence(
    id = OccurrenceId(id),
    commitmentId = CommitmentId(commitmentId),
    title = title,
    type = CommitmentType.valueOf(type),
    effort = EffortLevel.valueOf(effort),
    category = RoutineCategory.valueOf(category),
    goalId = goalId?.let(::GoalId),
    dayKey = LocalDate.parse(dayKey),
    zoneId = ZoneId.of(zoneId),
    plannedStart = plannedStartEpochMillis?.let(Instant::ofEpochMilli),
    deadline = Instant.ofEpochMilli(deadlineEpochMillis),
    state = OccurrenceState.valueOf(state),
)

fun Occurrence.toEntity(): OccurrenceEntity = OccurrenceEntity(
    id = id.value,
    commitmentId = commitmentId.value,
    title = title,
    type = type.name,
    effort = effort.name,
    category = category.name,
    goalId = goalId?.value,
    dayKey = dayKey.toString(),
    zoneId = zoneId.id,
    plannedStartEpochMillis = plannedStart?.toEpochMilli(),
    deadlineEpochMillis = deadline.toEpochMilli(),
    state = state.name,
)

fun CheckInRecord.toEntity(editCount: Int = 0): CheckInEntity = CheckInEntity(
    occurrenceId = occurrenceId.value,
    checkedInAtEpochMillis = checkedInAt.toEpochMilli(),
    origin = origin.name,
    delayMinutes = delayMinutes,
    delayTier = delayTier.name,
    editCount = editCount,
)

fun CheckInEntity.toDomain(): CheckInRecord = CheckInRecord(
    occurrenceId = OccurrenceId(occurrenceId),
    checkedInAt = Instant.ofEpochMilli(checkedInAtEpochMillis),
    origin = CheckInOrigin.valueOf(origin),
    delayMinutes = delayMinutes,
    delayTier = DelayTier.valueOf(delayTier),
)

fun LedgerEntry.toEntity(): LedgerEntryEntity = LedgerEntryEntity(
    id = id.value,
    currency = currency.name,
    amount = amount,
    ruleKey = ruleKey,
    referenceId = referenceId,
    createdAtEpochMillis = createdAt.toEpochMilli(),
    economyConfigVersion = economyConfigVersion,
)

fun LedgerEntryEntity.toDomain(): LedgerEntry = LedgerEntry(
    id = LedgerEntryId(id),
    currency = CurrencyType.valueOf(currency),
    amount = amount,
    ruleKey = ruleKey,
    referenceId = referenceId,
    createdAt = Instant.ofEpochMilli(createdAtEpochMillis),
    economyConfigVersion = economyConfigVersion,
)

fun GoalStepEntity.toDomain(): GoalStep = GoalStep(
    id = GoalStepId(id),
    goalId = GoalId(goalId),
    title = title,
    order = order,
    estMinutes = estMinutes,
    targetDate = targetDateIso?.let(LocalDate::parse),
    doneAt = doneAtEpochMillis?.let(Instant::ofEpochMilli),
    archived = archived,
)

fun GoalStep.toEntity(): GoalStepEntity = GoalStepEntity(
    id = id.value,
    goalId = goalId.value,
    title = title,
    order = order,
    estMinutes = estMinutes,
    targetDateIso = targetDate?.toString(),
    doneAtEpochMillis = doneAt?.toEpochMilli(),
    archived = archived,
)

fun RewardEventEntity.toDomain(): RewardEvent = RewardEvent(
    id = RewardEventId(id),
    idempotencyKey = idempotencyKey,
    kind = kind,
    fishDelta = fishDelta,
    bondDelta = bondDelta,
    refId = refId,
    at = Instant.ofEpochMilli(atEpochMillis),
    logicalDay = LocalDate.parse(logicalDay),
)

fun RewardEvent.toEntity(): RewardEventEntity = RewardEventEntity(
    id = id.value,
    idempotencyKey = idempotencyKey,
    kind = kind,
    fishDelta = fishDelta,
    bondDelta = bondDelta,
    refId = refId,
    atEpochMillis = at.toEpochMilli(),
    logicalDay = logicalDay.toString(),
)

fun WeeklyLogEntity.toDomain(): WeeklyLog = WeeklyLog(
    weekStartLogicalDay = LocalDate.parse(weekStartLogicalDay),
    snapshotJson = snapshotJson,
    configVersion = configVersion,
    createdAt = Instant.ofEpochMilli(createdAtEpochMillis),
)

fun WeeklyLog.toEntity(): WeeklyLogEntity = WeeklyLogEntity(
    weekStartLogicalDay = weekStartLogicalDay.toString(),
    snapshotJson = snapshotJson,
    configVersion = configVersion,
    createdAtEpochMillis = createdAt.toEpochMilli(),
)
