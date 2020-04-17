/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import {CollectionBase, SingleSelection} from '@react-types/shared';
import {useControlledState} from '@react-stately/utils';
import {useSelectState} from '@react-stately/select';
import {Key, useEffect, useState} from 'react';
import {Collection, Node} from "@react-stately/collections";


export interface ComboBoxState<T> {
  // collection: Collection<Node<T>>,
  // // disabledKeys: Set<Key>,   will combobox have disabled items in its list?
  // selectionManager: SelectionManager,
  isOpen: boolean,
  setOpen: (isOpen: boolean) => void,
  value: string,
  setValue: (value: string) => void
  // TODO add liststate types and menutrigger types here
}

interface ComboBoxProps<T> extends CollectionBase<T>, SingleSelection {
  isOpen?: boolean,
  defaultOpen?: boolean,
  onOpenChange?: (isOpen: boolean) => void,
  inputValue?: string,
  defaultInputValue?: string,
  onInputChange?: (value: string) => void,
  onFilter?: (value: string) => void,
  allowsCustomValue?: boolean,
  onCustomValue?: (value: string) => void,
  completionMode?: 'suggest' | 'complete',
  menuTrigger?: 'focus' | 'input' | 'manual'
}

function* filter(nodes, filterFn) {
  for (let node of nodes) {
    if (filterFn(node)) {
      yield node;
    }
  }
}

class FilteredCollection implements Collection<Node<T>> {
  private keyMap: Map<Key, Node<T>> = new Map();
  private iterable: Iterable<Node<T>>;
  private firstKey: Key;
  private lastKey: Key;

  constructor(nodes: Iterable<Node<T>>, filterFn: (textValue: string) => boolean) {
    this.iterable = filter(nodes, filterFn);

    let visit = (node: Node<T>) => {
      this.keyMap.set(node.key, node);

      if (node.childNodes && (node.type === 'section' || node.isExpanded)) {
        for (let child of node.childNodes) {
          visit(child);
        }
      }
    };

    for (let node of nodes) {
      visit(node);
    }

    let last: Node<T>;
    let index = 0;
    for (let [key, node] of this.keyMap) {
      if (last) {
        last.nextKey = key;
        node.prevKey = last.key;
      } else {
        this.firstKey = key;
      }

      if (node.type === 'item') {
        node.index = index++;
      }

      last = node;
    }

    this.lastKey = last ? last.key : last;
  }

  *[Symbol.iterator]() {
    yield* this.iterable;
  }

  get size() {
    return this.keyMap.size;
  }

  getKeys() {
    return this.keyMap.keys();
  }

  getKeyBefore(key: Key) {
    let node = this.keyMap.get(key);
    return node ? node.prevKey : null;
  }

  getKeyAfter(key: Key) {
    let node = this.keyMap.get(key);
    return node ? node.nextKey : null;
  }

  getFirstKey() {
    return this.firstKey;
  }

  getLastKey() {
    return this.lastKey;
  }

  getItem(key: Key) {
    return this.keyMap.get(key);
  }
}

export function useComboBoxState<T>(props: ComboBoxProps<T>): ComboBoxState<T> {
  let itemsControlled = !!props.onFilter;
  let menuControlled = props.isOpen !== undefined;
  let valueControlled = props.inputValue !== undefined;
  let selectedControlled = !!props.selectedKey;


  let [value, setValue] = useControlledState(toString(props.inputValue), toString(props.defaultInputValue) || '', props.onInputChange);

  let selectState  = useSelectState(props);
  selectState.collection = new FilteredCollection(selectState.collection, (node) => {
    console.log(node);
    return node.textValue.startsWith(value);
  });
  console.log(selectState.collection.size);

  //  let areThereItems = listState.collection.size > 0;

  let setOpen = (open) => {
    if (selectState.collection.size === 0 && open) {
      return;
    }
    selectState.setOpen(open);
  }

  // For completionMode = complete
  let [suggestionValue, setSuggestionValue] = useState('');

  // selectedItemState (aria-activedecendent), maybe just need to modify useSelectableItem or something

  return {
    ...selectState,
    setOpen,
    value,
    setValue
  };
}


function toString(val) {
  if (val == null) {
    return;
  }

  return val.toString();
}
